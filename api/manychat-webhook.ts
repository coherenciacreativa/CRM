import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractEmail, type EmailGuess } from '../lib/utils/extract.js';
import { extractLocationFromText } from '../lib/utils/location.js';
import { getDmText, makeDedupeKey } from '../lib/utils/payload.js';
import { resolveMlGroups } from '../lib/config/ml-groups.js';
import { safeSbPatchContactByEmail, sbInsert, sbPatch, sbReady, sbSelect } from '../lib/utils/sb.js';

console.log('[manychat-webhook] module loaded');

const MAILERLITE_API_KEY =
  process.env.MAILERLITE_API_KEY ?? process.env.MAILERLITE_TOKEN ?? process.env.ML_API_KEY;
const MAILERLITE_DEFAULT_NOTES =
  process.env.MAILERLITE_DEFAULT_NOTES ??
  process.env.DEFAULT_NOTES ??
  'Lead captured via Instagram DM';
const MAILERLITE_ENDPOINT = 'https://connect.mailerlite.com/api/subscribers';
const MAX_MAILERLITE_ATTEMPTS = 3;
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL ?? process.env.ALERT_SLACK_WEBHOOK;
const ALERT_WEBHOOK_CHANNEL = process.env.ALERT_WEBHOOK_CHANNEL ?? 'crm-alerts';

type ParsedLeadDetails = {
  email?: string;
  name?: string;
  country?: string;
  city?: string;
  phone?: string;
  message?: string;
  rawText?: string;
  confidence: number;
  matched: string[];
  sources: Partial<Record<keyof ParsedLeadDetails, string>>;
  sourceRanks: Partial<Record<keyof ParsedLeadDetails, number>>;
};

const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phoneRegex = /\+?\d[\d .()/-]{6,}\d/;

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeLabel = (value: string): string =>
  normalize(value).replace(/[^a-z0-9]+/g, ' ').trim();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

// --- Anti-placeholder name guards ---
const BAD_NAMES = new Set([
  'full name',
  'fullname',
  'your name',
  'tu nombre',
  'name',
  'n/a',
  'na',
  '-',
  '—',
  'unknown',
  'test',
  'prueba',
]);

const sanitizeName = (raw?: string): string | undefined => {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return undefined;
  if (s.includes('@')) return undefined;
  if (BAD_NAMES.has(s.toLowerCase())) return undefined;
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  const digits = s.replace(/\D/g, '');
  if (letters.length < 2) return undefined;
  if (digits.length > Math.max(2, Math.floor(letters.length / 2))) return undefined;
  const t = s.replace(/[._\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return toTitleCase(t);
};

const humanizeIdentifier = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/^[^a-z0-9]+/i, '').replace(/[^a-z0-9]+$/i, '');
  if (!normalized) return undefined;
  const tokens = normalized.split(/[_.\-\s]+/).filter(Boolean);
  if (!tokens.length) return undefined;
  return tokens.map((token) => toTitleCase(token)).join(' ');
};

const deriveNameFromEmail = (email: string | undefined): string | undefined => {
  if (!email) return undefined;
  const trimmed = email.trim();
  if (!trimmed) return undefined;
  const [local] = trimmed.split('@');
  if (!local) return undefined;
  const tokens = local.split(/[._+\-]+/).filter(Boolean);
  if (tokens.length < 1) return undefined;
  const meaningful = tokens.filter((token) => /[a-zA-Z]/.test(token));
  if (!meaningful.length) return undefined;
  if (meaningful.length === 1 && meaningful[0].length < 3) return undefined;
  const candidate = meaningful.map((token) => toTitleCase(token)).join(' ');
  return candidate || undefined;
};

const NAME_HEURISTICS: Array<(text: string) => string | undefined> = [
  (text) => {
    const match = text.match(/(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+([a-záéíóúñü' ]{2,80})/i);
    if (!match?.[1]) return undefined;
    return match[1].replace(/[.,;].*$/, '').trim();
  },
  (text) => {
    const match = text.match(
      /(?:aqui|aquí)?\s*(?:te\s+escribe|te\s+habla|te\s+saluda|quien\s+te\s+escribe\s+es|quien\s+te\s+saluda\s+es|este\s+es)\s+([a-záéíóúñü' ]{2,80})/i,
    );
    if (!match?.[1]) return undefined;
    return match[1].replace(/[.,;].*$/, '').trim();
  },
];

const extractNameFromDmText = (text?: string): string | undefined => {
  if (!text) return undefined;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  for (const heuristic of NAME_HEURISTICS) {
    const candidate = heuristic(cleaned);
    const sanitized = sanitizeName(candidate);
    if (sanitized) return sanitized;
  }
  return undefined;
};

const derivePreferredName = (input: {
  igProfileName?: string;
  existingName?: string;
  dmName?: string;
  igUsername?: string;
  email?: string | null | undefined;
}): string | undefined => {
  const candidates: string[] = [];
  const pushCandidate = (value?: string) => {
    const sanitized = sanitizeName(value);
    if (sanitized && !candidates.includes(sanitized)) {
      candidates.push(sanitized);
    }
  };

  pushCandidate(input.igProfileName);
  pushCandidate(input.existingName);
  pushCandidate(input.dmName);
  if (input.igUsername) {
    pushCandidate(humanizeIdentifier(input.igUsername) ?? input.igUsername);
  }
  if (input.email) {
    pushCandidate(deriveNameFromEmail(input.email));
  }

  return candidates[0];
};

const splitName = (value: string | undefined): { first?: string; last?: string } => {
  if (!value) return {};
  const tokens = value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return {};
  if (tokens.length === 1) {
    return { first: toTitleCase(tokens[0]) };
  }
  const first = toTitleCase(tokens[0]);
  const last = toTitleCase(tokens.slice(1).join(' '));
  return { first, last };
};

const normalizeCountryKey = (value: string): string =>
  normalize(value)
    .replace(/[^a-z\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

type CountryAliasConfig = { canonical: string; aliases?: string[] };

const COUNTRY_ALIASES: CountryAliasConfig[] = [
  { canonical: 'Argentina' },
  { canonical: 'Bolivia' },
  { canonical: 'Brasil', aliases: ['Brazil'] },
  { canonical: 'Chile' },
  { canonical: 'Colombia' },
  { canonical: 'Costa Rica' },
  { canonical: 'Cuba' },
  { canonical: 'Ecuador' },
  { canonical: 'El Salvador', aliases: ['Salvador'] },
  { canonical: 'España', aliases: ['Spain'] },
  { canonical: 'Estados Unidos', aliases: ['United States', 'USA', 'EEUU', 'U.S.A.', 'Usa'] },
  { canonical: 'Guatemala' },
  { canonical: 'Honduras' },
  { canonical: 'México', aliases: ['Mexico'] },
  { canonical: 'Nicaragua' },
  { canonical: 'Panamá', aliases: ['Panama'] },
  { canonical: 'Paraguay' },
  { canonical: 'Perú', aliases: ['Peru'] },
  { canonical: 'Puerto Rico' },
  { canonical: 'República Dominicana', aliases: ['Republica Dominicana'] },
  { canonical: 'Uruguay' },
  { canonical: 'Venezuela' },
  { canonical: 'Canadá', aliases: ['Canada'] },
  { canonical: 'Italia', aliases: ['Italy'] },
  { canonical: 'Francia', aliases: ['France'] },
  { canonical: 'Alemania', aliases: ['Germany'] },
  { canonical: 'Portugal' },
  { canonical: 'Reino Unido', aliases: ['United Kingdom', 'Inglaterra', 'England'] },
  { canonical: 'Suiza', aliases: ['Switzerland'] },
  { canonical: 'Suecia', aliases: ['Sweden'] },
  { canonical: 'Países Bajos', aliases: ['Holanda', 'Netherlands'] },
  { canonical: 'Australia' },
  { canonical: 'Nueva Zelanda', aliases: ['New Zealand'] },
  { canonical: 'Japón', aliases: ['Japan'] },
  { canonical: 'China' },
  { canonical: 'India' },
  { canonical: 'Filipinas', aliases: ['Philippines'] },
  { canonical: 'Corea del Sur', aliases: ['South Korea'] },
];

const COUNTRY_MAP = (() => {
  const map = new Map<string, string>();
  for (const entry of COUNTRY_ALIASES) {
    const canonicalKey = normalizeCountryKey(entry.canonical);
    if (canonicalKey) {
      map.set(canonicalKey, entry.canonical);
    }
    for (const alias of entry.aliases ?? []) {
      const aliasKey = normalizeCountryKey(alias);
      if (aliasKey) {
        map.set(aliasKey, entry.canonical);
      }
    }
  }
  return map;
})();

const matchCountryName = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const normalized = normalizeCountryKey(value);
  if (!normalized) return undefined;
  return COUNTRY_MAP.get(normalized);
};

const CITY_TO_COUNTRY_ENTRIES: Array<[string, string]> = [
  ['bogota', 'Colombia'],
  ['bogotá', 'Colombia'],
  ['medellin', 'Colombia'],
  ['medellín', 'Colombia'],
  ['cali', 'Colombia'],
  ['barranquilla', 'Colombia'],
  ['cartagena', 'Colombia'],
  ['bucaramanga', 'Colombia'],
  ['pereira', 'Colombia'],
  ['manizales', 'Colombia'],
  ['santa marta', 'Colombia'],
  ['santamarta', 'Colombia'],
  ['armenia', 'Colombia'],
  ['cucuta', 'Colombia'],
  ['cúcuta', 'Colombia'],
  ['envigado', 'Colombia'],
  ['soacha', 'Colombia'],
  ['ibague', 'Colombia'],
  ['ibagué', 'Colombia'],
  ['neiva', 'Colombia'],
  ['villavicencio', 'Colombia'],
  ['sincelejo', 'Colombia'],
  ['tunja', 'Colombia'],
  ['popayan', 'Colombia'],
  ['popayán', 'Colombia'],
  ['cartago', 'Colombia'],
  ['la paz', 'Bolivia'],
  ['lapaz', 'Bolivia'],
  ['santa cruz', 'Bolivia'],
  ['santacruz', 'Bolivia'],
  ['cochabamba', 'Bolivia'],
  ['sucre', 'Bolivia'],
  ['potosi', 'Bolivia'],
  ['potosí', 'Bolivia'],
  ['tarija', 'Bolivia'],
  ['oruro', 'Bolivia'],
  ['trinidad', 'Bolivia'],
  ['montero', 'Bolivia'],
  ['quito', 'Ecuador'],
  ['guayaquil', 'Ecuador'],
  ['cuenca', 'Ecuador'],
  ['ambato', 'Ecuador'],
  ['machala', 'Ecuador'],
  ['loja', 'Ecuador'],
  ['duran', 'Ecuador'],
  ['durán', 'Ecuador'],
  ['santiago', 'Chile'],
  ['valparaiso', 'Chile'],
  ['valparaíso', 'Chile'],
  ['concepcion', 'Chile'],
  ['concepción', 'Chile'],
  ['lima', 'Perú'],
  ['cusco', 'Perú'],
  ['cuzco', 'Perú'],
  ['arequipa', 'Perú'],
  ['trujillo', 'Perú'],
  ['piura', 'Perú'],
  ['chiclayo', 'Perú'],
  ['huancayo', 'Perú'],
  ['puno', 'Perú'],
  ['iquitos', 'Perú'],
  ['mexico', 'México'],
  ['méxico', 'México'],
  ['ciudad de mexico', 'México'],
  ['cdmx', 'México'],
  ['guadalajara', 'México'],
  ['monterrey', 'México'],
  ['queretaro', 'México'],
  ['querétaro', 'México'],
  ['puebla', 'México'],
  ['leon', 'México'],
  ['león', 'México'],
  ['tijuana', 'México'],
  ['cancun', 'México'],
  ['cancún', 'México'],
  ['buenos aires', 'Argentina'],
  ['cordoba', 'Argentina'],
  ['córdoba', 'Argentina'],
  ['rosario', 'Argentina'],
  ['mendoza', 'Argentina'],
  ['salta', 'Argentina'],
];

const CITY_TO_COUNTRY_MAP = (() => {
  const map = new Map<string, string>();
  for (const [city, country] of CITY_TO_COUNTRY_ENTRIES) {
    const key = normalize(city);
    if (key) map.set(key, country);
  }
  return map;
})();

const matchCountryFromCity = (city: string | undefined): string | undefined => {
  if (!city) return undefined;
  const key = normalize(city);
  if (!key) return undefined;
  return CITY_TO_COUNTRY_MAP.get(key);
};

const parseLocationComponents = (raw: string): { city?: string; country?: string } => {
  if (!raw) return {};
  const cleaned = raw.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
  if (!cleaned) return {};

  const parts = cleaned.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const cityCandidate = parts[0];
    const countryAggregate = parts.slice(1).join(' ');
    const matchedCountry = matchCountryName(countryAggregate) ?? matchCountryName(parts[parts.length - 1]);
    return {
      city: cityCandidate ? toTitleCase(cityCandidate) : undefined,
      country: matchedCountry ?? (countryAggregate ? toTitleCase(countryAggregate) : undefined),
    };
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (!tokens.length) return {};

  for (let start = tokens.length - 1; start >= 0; start -= 1) {
    const candidate = tokens.slice(start).join(' ');
    const matchedCountry = matchCountryName(candidate);
    if (matchedCountry) {
      const cityTokens = tokens.slice(0, start);
      return {
        city: cityTokens.length ? toTitleCase(cityTokens.join(' ')) : undefined,
        country: matchedCountry,
      };
    }
  }

  return { city: toTitleCase(cleaned) };
};

const postAlert = async (payload: Record<string, unknown>) => {
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: ALERT_WEBHOOK_CHANNEL,
        ...payload,
      }),
    });
  } catch (error) {
    console.error('Alert webhook failed', error);
  }
};

const formatAlertPayload = (context: {
  title: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
}) => ({
  severity: context.severity,
  title: context.title,
  message: context.message,
  meta: context.meta,
  timestamp: new Date().toISOString(),
});

type ManyChatCustomField = Record<string, unknown> | Array<{
  id?: string | number;
  name?: string;
  title?: string;
  value?: unknown;
}>;

export type ManyChatContact = {
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phones?: Array<string | number>;
  emails?: Array<string>;
  tags?: Array<{ name?: string } | string>;
  custom_fields?: ManyChatCustomField;
  social_profiles?: Array<{
    type?: string;
    name?: string;
    username?: string;
    id?: string | number;
    link?: string;
  }>;
  last_interaction?: string;
};

export type ManyChatPayload = {
  event?: string;
  timestamp?: number | string;
  source?: string;
  contact?: ManyChatContact;
  message?: { text?: string; type?: string };
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

const SECRET_HEADER = 'x-webhook-secret';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_URL_CRM;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_CRM;

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

const lower = (value: unknown): string => (typeof value === 'string' ? normalize(value) : '');

const safetyString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return undefined;
};

const fallbackString = (payload: ManyChatPayload, key: string): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  return safetyString((payload as Record<string, unknown>)[key]);
};

const coerceContact = (payload: ManyChatPayload): ManyChatContact => {
  const contact = { ...(payload.contact ?? {}) } as ManyChatContact;
  const rawPayload = (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) as Record<string, unknown>;
  const fromPayload = (key: string) => fallbackString(payload, key);

  contact.id = contact.id ?? fromPayload('contact_id');
  contact.name = contact.name ?? fromPayload('full_name');
  contact.first_name = contact.first_name ?? fromPayload('first_name');
  contact.last_name = contact.last_name ?? fromPayload('last_name');
  contact.email = contact.email ?? fromPayload('email') ?? fromPayload('subscriber_email');
  contact.phone = contact.phone ?? fromPayload('phone') ?? fromPayload('subscriber_phone');

  if (!contact.emails) {
    const value = rawPayload['emails'];
    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => safetyString(item))
        .filter((item): item is string => Boolean(item));
      if (normalized.length) {
        contact.emails = normalized;
      }
    } else {
      const fallback = fromPayload('emails');
      if (fallback) {
        const normalized = fallback.split(',').map((item) => item.trim()).filter(Boolean);
        if (normalized.length) {
          contact.emails = normalized;
        }
      }
    }
  }

  if (!contact.phones) {
    const value = rawPayload['phones'];
    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => (typeof item === 'number' ? String(item) : safetyString(item)))
        .filter((item): item is string => Boolean(item));
      if (normalized.length) {
        contact.phones = normalized;
      }
    } else {
      const fallback = fromPayload('phones');
      if (fallback) {
        const normalized = fallback.split(',').map((item) => item.trim()).filter(Boolean);
        if (normalized.length) {
          contact.phones = normalized;
        }
      }
    }
  }

  if (!contact.tags) {
    const tags = rawPayload['tags'];
    if (Array.isArray(tags)) {
      contact.tags = tags as ManyChatContact['tags'];
    }
  }

  return contact;
};

const pickFirst = <T>(value: unknown): T | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item != null && item !== '') {
        return item as T;
      }
    }
    return undefined;
  }
  return value == null || value === '' ? undefined : (value as T);
};

const findCustomField = (fields: ManyChatCustomField | undefined, candidates: string[]): string | undefined => {
  if (!fields) return undefined;
  const normalizedCandidates = candidates.map((candidate) => normalizeLabel(candidate));

  if (Array.isArray(fields)) {
    for (const field of fields) {
      const label = normalizeLabel(safetyString(field?.name) ?? safetyString(field?.title) ?? '');
      if (!label) continue;
      if (!normalizedCandidates.includes(label)) continue;
      const value = safetyString(field?.value);
      if (value) return value;
    }
    return undefined;
  }

  const record = fields as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    const label = normalizeLabel(key);
    if (!label || !normalizedCandidates.includes(label)) continue;
    const str = safetyString(value);
    if (str) return str;
  }
  return undefined;
};

const mapTags = (tags: ManyChatContact['tags']): string[] | undefined => {
  if (!tags) return undefined;
  const values = tags
    .map((tag) => {
      if (typeof tag === 'string') return tag.trim();
      if (!tag || typeof tag !== 'object') return undefined;
      return safetyString(tag.name);
    })
    .filter((value): value is string => Boolean(value));
  return values.length ? Array.from(new Set(values)) : undefined;
};

const extractInstagram = (contact: ManyChatContact | undefined): { username?: string; id?: string } => {
  if (!contact?.social_profiles) return {};
  for (const profile of contact.social_profiles) {
    const type = lower(profile?.type ?? profile?.name);
    if (type.includes('instagram') || type === 'ig') {
      return {
        username: safetyString(profile?.username) ?? safetyString(profile?.name),
        id: safetyString(profile?.id),
      };
    }
  }
  return {};
};

const extractContactRecord = (payload: ManyChatPayload) => {
  const contact = coerceContact(payload);
  const { username: instagramUsername, id: instagramId } = extractInstagram(contact);
  const fallbackInstagramUsername = fallbackString(payload, 'instagram_username');
  const fallbackInstagramId = fallbackString(payload, 'instagram_id') ?? fallbackString(payload, 'instagram_user_id');

  const customEmail = findCustomField(contact.custom_fields, [
    'email',
    'correo',
    'correo_electronico',
    'mail',
  ]);
  const customPhone = findCustomField(contact.custom_fields, [
    'phone',
    'telefono',
    'celular',
    'whatsapp',
  ]);
  const customHandle = findCustomField(contact.custom_fields, [
    'instagram',
    'instagram_handle',
    'instagram_username',
    'ig_username',
  ]) ?? fallbackInstagramUsername;
  const customIgId = findCustomField(contact.custom_fields, ['instagram_id', 'ig_id']) ?? fallbackInstagramId;
  const customCountry = findCustomField(contact.custom_fields, [
    'country',
    'pais',
    'país',
  ]);
  const customCity = findCustomField(contact.custom_fields, [
    'city',
    'ciudad',
    'ciudad_residencia',
    'city_name',
  ]);

  const rawEmail = safetyString(contact.email) ?? safetyString(contact.emails && pickFirst(contact.emails));
  const rawPhone = safetyString(contact.phone) ?? safetyString(contact.phones && pickFirst(contact.phones));

  const email = safetyString(customEmail ?? rawEmail ?? fallbackString(payload, 'contact_email'));
  const phone = safetyString(customPhone ?? rawPhone ?? fallbackString(payload, 'contact_phone'));
  const manychatId = safetyString(contact.id) ?? fallbackString(payload, 'contact_id');

  const rawName =
    (safetyString(contact.name) ??
      [safetyString(contact.first_name), safetyString(contact.last_name)].filter(Boolean).join(' ').trim()) ||
    '';
  const name = sanitizeName(humanizeIdentifier(rawName) ?? rawName);

  const record: Record<string, unknown> = {
    manychat_contact_id: manychatId,
    name: name || undefined, // only if it passed sanitizeName
    first_name: safetyString(contact.first_name),
    last_name: safetyString(contact.last_name),
    email,
    phone,
    country: safetyString(customCountry) ?? fallbackString(payload, 'country'),
    city: safetyString(customCity) ?? fallbackString(payload, 'city'),
    instagram_username: safetyString(customHandle) ?? instagramUsername,
    ig_user_id: safetyString(customIgId) ?? instagramId,
    tags: mapTags(contact.tags),
    source: 'manychat',
    updated_at: new Date().toISOString(),
  };

  return {
    record,
    contact,
  };
};

const parseLeadDetails = (payload: ManyChatPayload, contact: ManyChatContact): ParsedLeadDetails => {
  const details: ParsedLeadDetails = {
    confidence: 0,
    matched: [],
    sources: {},
    sourceRanks: {},
  };

  const { username: instagramUsernameRaw } = extractInstagram(contact);
  const instagramUsername = safetyString(instagramUsernameRaw);

  const sourcePriority = (origin: string): number => {
    if (origin.startsWith('text:heuristic')) return 400;
    if (origin.startsWith('text')) return 300;
    if (origin === 'custom_field') return 200;
    if (origin === 'contact') return 100;
    if (origin === 'instagram_username') return 90;
    if (origin === 'email_local') return 80;
    return 50;
  };

  const capture = (field: keyof ParsedLeadDetails, value: string | undefined, origin: string) => {
    const safe = safetyString(value);
    if (!safe) return;
    const rank = sourcePriority(origin);
    const currentRank = (details.sourceRanks[field] ?? Number.NEGATIVE_INFINITY) as number;

    if (field === 'message') {
      if (rank < currentRank) return;
      if (rank === currentRank && details.message && safe.length <= details.message.length) return;
      details.message = safe;
      details.sourceRanks[field] = rank;
      details.sources[field] = origin;
      details.matched.push(origin);
      return;
    }

    if (rank < currentRank) return;
    if (rank === currentRank && details[field]) return;

    if (field === 'name') {
      const cleaned = sanitizeName(safe);
      if (!cleaned) return;
      (details as Record<string, unknown>)[field] = cleaned;
    } else {
      (details as Record<string, unknown>)[field] = safe;
    }
    details.sourceRanks[field] = rank;
    details.sources[field] = origin;
    details.matched.push(origin);
  };

  const applyLocationCandidate = (raw: string | undefined, origin: string) => {
    if (!raw) return;
    const parsed = parseLocationComponents(raw);
    if (parsed.city) capture('city', parsed.city, origin);
    if (parsed.country) {
      capture('country', parsed.country, origin);
    } else if (parsed.city) {
      const inferredCountry = matchCountryFromCity(parsed.city);
      if (inferredCountry) capture('country', inferredCountry, `${origin}:city-inferred`);
    }
  };

  const contactEmail = safetyString(contact?.email) ?? safetyString(contact?.emails && pickFirst(contact.emails));
  capture('email', contactEmail, 'contact');

  const assembledName =
    safetyString(contact?.name) ??
    [safetyString(contact?.first_name), safetyString(contact?.last_name)].filter(Boolean).join(' ').trim();
  const normalizedContactName = humanizeIdentifier(assembledName) ?? assembledName;
  if (normalizedContactName) capture('name', normalizedContactName, 'contact');
  capture('phone', safetyString(contact?.phone) ?? safetyString(contact?.phones && pickFirst(contact.phones)), 'contact');

  const fieldCountry = findCustomField(contact?.custom_fields, ['country', 'pais', 'país']);
  const fieldCity = findCustomField(contact?.custom_fields, ['city', 'ciudad', 'city_name', 'ciudad_residencia']);
  capture('country', fieldCountry, 'custom_field');
  capture('city', fieldCity, 'custom_field');

  const textCandidates = new Set<string>();
  const pushText = (value?: string) => {
    const safe = safetyString(value);
    if (safe) textCandidates.add(safe);
  };

  pushText(payload.message?.text);
  pushText(fallbackString(payload, 'last_text_input'));
  pushText(fallbackString(payload, 'message_text'));
  pushText(fallbackString(payload, 'text'));

  if (payload.data && typeof payload.data === 'object') {
    const dataObject = payload.data as Record<string, unknown>;
    for (const value of Object.values(dataObject)) {
      if (typeof value === 'string') {
        pushText(value);
      }
    }
  }

  const text = Array.from(textCandidates).join('\n').trim();
  if (text) {
    details.rawText = text;

    const emailMatch = text.match(emailRegex);
    capture('email', emailMatch ? emailMatch[0] : undefined, 'text');

    const phoneMatch = text.match(phoneRegex);
    capture('phone', phoneMatch ? phoneMatch[0] : undefined, 'text');

    const messageHeuristics: Array<{ regex: RegExp; field: keyof ParsedLeadDetails; post?: (match: RegExpMatchArray) => string | undefined }>
      = [
        {
          regex: /(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+([a-záéíóúñü' ]{2,80})/i,
          field: 'name',
          post: (match) => {
            const candidate = match[1]?.replace(/[.,;].*$/, '').trim();
            return candidate ? toTitleCase(candidate) : undefined;
          },
        },
        {
          regex: /(?:aqui|aquí)?\s*(?:te\s+escribe|te\s+habla|te\s+saluda|quien\s+te\s+escribe\s+es|quien\s+te\s+saluda\s+es|este\s+es)\s+([a-záéíóúñü' ]{2,80})/i,
          field: 'name',
          post: (match) => {
            const candidate = match[1]?.replace(/[.,;].*$/, '').trim();
            return candidate ? toTitleCase(candidate) : undefined;
          },
        },
      ];

    for (const heuristic of messageHeuristics) {
      const found = text.match(heuristic.regex);
      if (!found) continue;
      const value = heuristic.post ? heuristic.post(found) : safetyString(found[1]);
      if (value) capture(heuristic.field, value, 'text:heuristic');
    }

  const locationMatch = text.match(
    /(?:vivo|resido|estoy|radico|me\s+encuentro)\s+(?:actualmente\s+)?(?:en|en\s+la\s+ciudad\s+de)\s+([a-záéíóúñü' ,]+?)(?:[.!?]|$)/i,
  );
  if (locationMatch) {
    applyLocationCandidate(locationMatch[1], 'text:heuristic');
  }

  const generalLocationMatch = text.match(
    /(?:de|desde|soy\s+de|somos\s+de|procedo\s+de|vengo\s+de|originario\s+de|originaria\s+de|nac[ií]\s+en|radico\s+en)\s+([a-záéíóúñü' ,]+?)(?:[.!?]|$)/i,
  );
  if (generalLocationMatch) {
    applyLocationCandidate(generalLocationMatch[1], 'text:heuristic');
  }

    const lineMatches = text
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const labelMapping: Array<{ labels: string[]; field: keyof ParsedLeadDetails }> = [
      { labels: ['nombre', 'name', 'nombre completo', 'full name'], field: 'name' },
      { labels: ['correo', 'email', 'correo electronico', 'correo electrónico', 'mail'], field: 'email' },
      { labels: ['pais', 'país', 'country'], field: 'country' },
      { labels: ['ciudad', 'city'], field: 'city' },
      { labels: ['mensaje', 'message', 'comentario', 'message body'], field: 'message' },
      { labels: ['telefono', 'teléfono', 'phone', 'whatsapp'], field: 'phone' },
    ];

    const labelLookup = new Map<string, keyof ParsedLeadDetails>();
    for (const { labels, field } of labelMapping) {
      for (const label of labels) {
        labelLookup.set(normalizeLabel(label), field);
      }
    }

    for (let index = 0; index < lineMatches.length; index += 1) {
      const line = lineMatches[index];
      const [rawLabel, ...restPieces] = line.split(/[:\-–]/);
      if (!rawLabel || !restPieces.length) continue;
      const labelKey = normalizeLabel(rawLabel);
      const field = labelLookup.get(labelKey);
      if (!field) continue;
      const remainder = restPieces.join(':').trim();
      if (field === 'message') {
        const collected = [remainder];
        let lookahead = index + 1;
        while (lookahead < lineMatches.length) {
          const nextLine = lineMatches[lookahead];
          const [nextLabel] = nextLine.split(/[:\-–]/);
          const normalizedNext = nextLabel ? normalizeLabel(nextLabel) : '';
          if (normalizedNext && labelLookup.has(normalizedNext)) {
            break;
          }
          collected.push(nextLine);
          lookahead += 1;
        }
        capture('message', collected.join(' ').trim(), 'text');
        continue;
      }
      capture(field, remainder, 'text');
    }

    if (!details.message) {
      capture('message', text, 'text:fallback');
    }
  }

  if (!details.name) {
    capture('name', humanizeIdentifier(instagramUsername), 'instagram_username');
  }
  if (!details.name) {
    const emailCandidate = details.email ?? contactEmail ?? fallbackString(payload, 'contact_email');
    capture('name', deriveNameFromEmail(emailCandidate), 'email_local');
  }

  if (details.city && !details.country) {
    const inferredCountry = matchCountryFromCity(details.city);
    if (inferredCountry) capture('country', inferredCountry, 'city-inferred');
  }

  const focusFields: Array<keyof ParsedLeadDetails> = ['email', 'name', 'country', 'city', 'message'];
  const filled = focusFields.reduce((count, field) => (details[field] ? count + 1 : count), 0);
  const bonus = details.phone ? 0.1 : 0;
  details.confidence = Math.min(1, Number((filled / focusFields.length + bonus).toFixed(2)));

  return details;
};

const insertContact = async (record: Record<string, unknown>) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase credentials');
  }
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/contacts?on_conflict=manychat_contact_id`, {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([record]),
  });

  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const error = body && typeof body === 'object' ? body : { message: bodyText };
    throw new Error(`Supabase contacts upsert failed: ${JSON.stringify(error)}`);
  }

  if (!Array.isArray(body) || !body.length) {
    throw new Error('Supabase contacts upsert returned empty response');
  }

  return body[0];
};

const fetchContactByEmail = async (email: string | undefined) => {
  if (!email) return null;
  const result = await sbSelect(
    `contacts?select=*&email=eq.${encodeURIComponent(email)}&limit=1`,
  );
  if (!result.ok || !Array.isArray(result.json) || !result.json.length) {
    return null;
  }
  return result.json[0] as Record<string, unknown>;
};

const insertInteraction = async (
  contactId: string,
  payload: ManyChatPayload,
  platformHint: 'instagram' | 'other',
  manychatContactId?: string,
  parsed?: ParsedLeadDetails,
) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase credentials');
  }

  const manychatId = safetyString(manychatContactId) ?? safetyString(payload.contact?.id) ?? fallbackString(payload, 'contact_id');
  const resolvedTimestamp = payload.timestamp
    ? new Date(typeof payload.timestamp === 'number' ? payload.timestamp * 1000 : payload.timestamp).toISOString()
    : new Date().toISOString();

  const externalIdParts = ['manychat'];
  if (manychatId) externalIdParts.push(manychatId);
  if (payload.event) externalIdParts.push(`event:${payload.event}`);
  externalIdParts.push(resolvedTimestamp);

  const resolvedContent = safetyString(parsed?.message) ?? safetyString(payload.message?.text) ?? fallbackString(payload, 'last_text_input');

  const record = {
    contact_id: contactId,
    platform: platformHint,
    direction: 'inbound',
    type: payload.event ? `manychat_${payload.event}` : 'manychat_webhook',
    external_id: externalIdParts.join(':'),
    content: resolvedContent,
    extracted_email: parsed?.email,
    extraction_confidence: parsed?.confidence,
    meta: { ...payload, parsed_lead: parsed },
    occurred_at: resolvedTimestamp,
  };

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/interactions`, {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify([record]),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase interactions insert failed: ${text || response.status}`);
  }
};

type MailerLiteSyncInput = {
  email?: string;
  name?: string;
  country?: string;
  city?: string;
  phone?: string;
  message?: string;
  instagramUsername?: string;
  manychatId?: string;
};

const shouldRetryMailerLite = (status: number) => status === 429 || status >= 500;

const readResponsePayload = async (response: any): Promise<Record<string, unknown> | null> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to parse MailerLite response JSON', error, text);
    return { raw: text } as Record<string, unknown>;
  }
};

const syncMailerLite = async (input: MailerLiteSyncInput) => {
  if (!MAILERLITE_API_KEY) {
    console.warn('MailerLite sync skipped: missing MAILERLITE_API_KEY');
    return;
  }
  const email = safetyString(input.email);
  if (!email) {
    console.warn('MailerLite sync skipped: no email detected');
    return;
  }

  const triggerGroups = resolveMlGroups();
  if (!triggerGroups.length) {
    throw new Error(
      'MailerLite sync aborted: no group IDs configured (set MAILERLITE_GROUP_IDS, MAILERLITE_GROUP_ID or MAILERLITE_ALLOWED_GROUP_ID)',
    );
  }

  const fields: Record<string, string> = {};
  if (input.country) fields.country = input.country;
  if (input.city) fields.city = input.city;
  if (input.phone) fields.phone = input.phone;
  if (input.instagramUsername) fields.instagram = input.instagramUsername;

  const safeName = sanitizeName(input.name);
  const { first: firstName, last: lastName } = splitName(safeName);
  if (safeName) {
    fields.name = safeName;
  }
  if (firstName) {
    fields.first_name = firstName;
    if (!fields.name) fields.name = firstName;
  }
  if (lastName) {
    fields.last_name = lastName;
  }

  const notesParts: string[] = [];
  if (MAILERLITE_DEFAULT_NOTES) notesParts.push(MAILERLITE_DEFAULT_NOTES);
  if (input.message) notesParts.push(input.message);
  if (input.manychatId) notesParts.push(`ManyChat ID: ${input.manychatId}`);
  if (notesParts.length) {
    fields.notas = notesParts.join(' - ');
  }

  const payload: Record<string, unknown> = {
    email,
    resubscribe: true,
  };

  if (triggerGroups.length) {
    payload.groups = triggerGroups;
  }

  if (safeName || firstName) {
    payload.name = safeName ?? firstName;
  }

  if (Object.keys(fields).length) {
    payload.fields = fields;
  }

  let attempt = 0;
  while (attempt < MAX_MAILERLITE_ATTEMPTS) {
    attempt += 1;
    const response = await fetch(MAILERLITE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await readResponsePayload(response);
    if (response.ok) {
      return data;
    }

    if (response.status === 409) {
      console.warn('MailerLite reported existing subscriber conflict; treating as success', data);
      return data;
    }

    if (response.status === 422) {
      const errors = Array.isArray((data as { errors?: unknown }).errors)
        ? ((data as { errors: Array<{ message?: string }> }).errors as Array<{ message?: string }> )
        : [];
      const duplicateEmail = errors.find((err) => typeof err?.message === 'string' && err.message.toLowerCase().includes('already'));
      if (duplicateEmail) {
        console.warn('MailerLite reports subscriber already exists; update skipped', data);
        return data;
      }
    }

    if (attempt < MAX_MAILERLITE_ATTEMPTS && shouldRetryMailerLite(response.status)) {
      const delay = 500 * attempt;
      console.warn(`MailerLite sync retry ${attempt}/${MAX_MAILERLITE_ATTEMPTS} after ${delay}ms`, data);
      await sleep(delay);
      continue;
    }

    throw new Error(
      `MailerLite sync failed (status ${response.status}): ${
        data ? JSON.stringify(data) : 'no body'
      }`,
    );
  }
};

export type PipelineResult = {
  contactId: string;
  manychatContactId: string;
  event: string | null;
  resolvedEmail?: string;
  matchedSources: string[];
};

export const executePipeline = async (
  payload: ManyChatPayload,
  emailGuess?: EmailGuess | null,
  context: { dmText?: string; igProfileName?: string; igUsername?: string } = {},
): Promise<PipelineResult> => {
  const { record, contact } = extractContactRecord(payload);
  const parsedLead = parseLeadDetails(payload, contact);

  if (emailGuess?.email && !parsedLead.email) {
    parsedLead.email = emailGuess.email;
    parsedLead.sources.email = 'email:fast-extract';
    parsedLead.sourceRanks.email = 1000;
    if (!parsedLead.matched.includes('email:fast-extract')) {
      parsedLead.matched.push('email:fast-extract');
    }
    parsedLead.confidence = Math.max(parsedLead.confidence, emailGuess.confidence);
  }

  const dmText = context.dmText ?? '';
  const locationGuess = extractLocationFromText(dmText);
  if (locationGuess?.city && !parsedLead.city) parsedLead.city = locationGuess.city;
  if (locationGuess?.country && !parsedLead.country) parsedLead.country = locationGuess.country;
  if (locationGuess?.city && !record.city) record.city = locationGuess.city;
  if (locationGuess?.country && !record.country) record.country = locationGuess.country;

  const dmDerivedName = extractNameFromDmText(dmText);
  const preferredName = derivePreferredName({
    igProfileName: context.igProfileName,
    existingName: parsedLead.name ?? (typeof record.name === 'string' ? record.name : undefined),
    dmName: dmDerivedName,
    igUsername: context.igUsername,
    email: emailGuess?.email ?? parsedLead.email ?? (typeof record.email === 'string' ? record.email : undefined),
  });

  if (preferredName) {
    parsedLead.name = preferredName;
    record.name = preferredName;
  }

  if (parsedLead.confidence < 0.4) {
    await postAlert(
      formatAlertPayload({
        severity: 'warn',
        title: 'Lead parsing low confidence',
        message: `Confidence ${parsedLead.confidence} for contact ${record.manychat_contact_id ?? 'unknown'}`,
        meta: {
          manychat_contact_id: record.manychat_contact_id,
          email: parsedLead.email ?? record.email,
          instagram_username: record.instagram_username,
          matched_sources: parsedLead.matched,
        },
      }),
    );
  }

  if (parsedLead.email) record.email = parsedLead.email;
  if (parsedLead.phone) record.phone = parsedLead.phone;
  if (parsedLead.country) record.country = parsedLead.country;
  if (parsedLead.city) record.city = parsedLead.city;
  if (parsedLead.name) {
    record.name = parsedLead.name;
    const nameTokens = parsedLead.name.split(/\s+/).filter(Boolean);
    if (nameTokens.length) {
      record.first_name = nameTokens[0];
      record.last_name = nameTokens.length > 1 ? nameTokens.slice(1).join(' ') : undefined;
    }
  }
  if (parsedLead.message) {
    record.notes = parsedLead.message;
  }

  const manychatContactId = safetyString(record.manychat_contact_id);
  if (!manychatContactId) {
    throw new Error('Missing ManyChat contact id');
  }

  let contactRow: Record<string, unknown> | null = null;
  try {
    contactRow = await insertContact(record);
  } catch (contactError) {
    const message = (contactError as Error).message || '';
    const duplicateEmail = message.includes('contacts_email_key') || message.includes('duplicate key value');
    if (!duplicateEmail) {
      throw contactError;
    }

    const existingByEmail = await fetchContactByEmail(safetyString(record.email));
    if (!existingByEmail) {
      throw contactError;
    }

    contactRow = existingByEmail;

    try {
      const patchPayload = { ...record } as Record<string, unknown>;
      delete patchPayload.manychat_contact_id;
      await sbPatch(`contacts?id=eq.${encodeURIComponent(String(existingByEmail.id))}`, patchPayload);
    } catch (patchError) {
      console.warn('Failed to patch contact after duplicate email match', patchError);
    }
  }

  if (!contactRow) {
    throw new Error('Supabase contact insert failed without fallback');
  }

  const resolvedEmail =
    parsedLead.email ??
    safetyString((contactRow as Record<string, unknown>).email) ??
    safetyString(record.email);
  const resolvedName =
    parsedLead.name ??
    safetyString((contactRow as Record<string, unknown>).name) ??
    safetyString(record.name);
  const resolvedCountry =
    parsedLead.country ??
    safetyString((contactRow as Record<string, unknown>).country) ??
    safetyString(record.country);
  const resolvedCity =
    parsedLead.city ??
    safetyString((contactRow as Record<string, unknown>).city) ??
    safetyString(record.city);
  const resolvedPhone =
    parsedLead.phone ??
    safetyString((contactRow as Record<string, unknown>).phone) ??
    safetyString(record.phone);
  const resolvedInstagram =
    safetyString((contactRow as Record<string, unknown>).instagram_username) ?? safetyString(record.instagram_username);
  const resolvedManychatId =
    safetyString((contactRow as Record<string, unknown>).manychat_contact_id) ?? safetyString(record.manychat_contact_id);

  if (resolvedEmail) {
    const patchPayload: Record<string, unknown> = {};
    if (preferredName && !safetyString((contactRow as Record<string, unknown>).name)) {
      patchPayload.name = preferredName;
    }
    if (locationGuess?.city && !safetyString((contactRow as Record<string, unknown>).city)) {
      patchPayload.city = locationGuess.city;
    }
    if (locationGuess?.country && !safetyString((contactRow as Record<string, unknown>).country)) {
      patchPayload.country = locationGuess.country;
    }
    if (Object.keys(patchPayload).length) {
      await safeSbPatchContactByEmail(resolvedEmail, patchPayload);
    }
  }

  const platformHint = resolvedInstagram || safetyString(record.ig_user_id) ? 'instagram' : 'other';

  try {
    await insertInteraction(contactRow.id as string, payload, platformHint, resolvedManychatId, parsedLead);
  } catch (interactionError) {
    console.error('Failed to insert interaction', interactionError);
  }

  try {
    await syncMailerLite({
      email: resolvedEmail,
      name: resolvedName,
      country: resolvedCountry,
      city: resolvedCity,
      phone: resolvedPhone,
      message: parsedLead.message,
      instagramUsername: resolvedInstagram,
      manychatId: resolvedManychatId,
    });
  } catch (mailerliteError) {
    await postAlert(
      formatAlertPayload({
        severity: 'error',
        title: 'MailerLite sync failed',
        message: (mailerliteError as Error).message,
        meta: {
          email: resolvedEmail,
          manychat_contact_id: resolvedManychatId,
        },
      }),
    );
    throw mailerliteError;
  }

  const eventName = payload.event ?? null;
  console.log('ManyChat webhook processed', {
    contact_id: contactRow.id,
    manychat_contact_id: manychatContactId,
    event: eventName,
    parsed: parsedLead.matched,
  });

  return {
    contactId: contactRow.id as string,
    manychatContactId: manychatContactId,
    event: eventName,
    resolvedEmail: resolvedEmail ?? undefined,
    matchedSources: parsedLead.matched,
  };
};

const validateSecret = (req: VercelRequest): boolean => {
  const expected = safetyString(process.env.MANYCHAT_WEBHOOK_SECRET);
  if (!expected) return true;
  const receivedHeader = req.headers[SECRET_HEADER] ?? req.headers[SECRET_HEADER as keyof typeof req.headers];
  const received = Array.isArray(receivedHeader) ? receivedHeader[0] : receivedHeader;
  return safetyString(received) === expected;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[manychat-webhook] start');
  const provider = 'instagram';
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    if (!validateSecret(req)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    let payload: ManyChatPayload | string | undefined = req.body as ManyChatPayload | string | undefined;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload) as ManyChatPayload;
      } catch (parseError) {
        console.error('ManyChat webhook JSON parse error', parseError, payload);
        return res.status(400).json({ ok: false, error: 'invalid_payload_json' });
      }
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    if (!sbReady()) {
      return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
    }

    const typedPayload = payload as ManyChatPayload;
    const rawPayload = typedPayload as any;
    const dmText = getDmText(rawPayload);
    const emailGuess = extractEmail(dmText);
    const igProfileNameTop =
      safetyString(rawPayload?.full_name) ??
      safetyString(rawPayload?.subscriber?.name) ??
      safetyString(rawPayload?.subscriber?.full_name) ??
      undefined;
    const igUsernameTop =
      safetyString(rawPayload?.instagram_username) ??
      safetyString(rawPayload?.subscriber?.username) ??
      undefined;

    const rawContactId =
      safetyString(typedPayload.contact?.id) ??
      fallbackString(typedPayload, 'contact_id') ??
      safetyString((typedPayload as Record<string, unknown>).contact_id) ??
      safetyString((typedPayload as Record<string, unknown>).subscriber && (typedPayload as any)?.subscriber?.id);
    const contactId = rawContactId || null;

    const messageId =
      safetyString((typedPayload as Record<string, unknown>).message_id) ??
      fallbackString(typedPayload, 'message_id') ??
      fallbackString(typedPayload, 'last_received_message_id') ??
      null;

    const dedupeKey = makeDedupeKey('instagram', contactId ?? undefined, dmText || undefined);
    const eventRow = {
      provider,
      contact_id: contactId,
      message_id: messageId,
      dedupe_key: dedupeKey,
      message_text: dmText || null,
      extracted_email: emailGuess?.email ?? null,
      extraction_confidence: emailGuess?.confidence ?? null,
      raw_payload: typedPayload,
      status: 'NEW',
    };

    const saveResult = await sbInsert('webhook_events', eventRow);
    const persisted = saveResult.ok || saveResult.status === 409;
    if (!persisted) {
      console.error('Failed to persist webhook event', saveResult);
      return res.status(500).json({ ok: false, error: 'persist_failed', detail: saveResult.json });
    }

    let finalStatus: 'PROCESSED' | 'FAILED' = 'PROCESSED';
    let pipelineError: Error | null = null;
    let pipelineResult: PipelineResult | null = null;

    try {
      pipelineResult = await executePipeline(typedPayload, emailGuess, {
        dmText,
        igProfileName: igProfileNameTop,
        igUsername: igUsernameTop,
      });
    } catch (error) {
      finalStatus = 'FAILED';
      pipelineError = error as Error;
      console.error('ManyChat pipeline execution failed', error);
      await postAlert(
        formatAlertPayload({
          severity: 'error',
          title: 'ManyChat webhook failed',
          message: (pipelineError as Error).message,
          meta: {
            requestId: (res as unknown as { reqId?: string })?.reqId ?? null,
            contact_id: contactId,
            message_id: messageId,
          },
        }),
      );
    }

    const patchPayload: Record<string, unknown> = {
      status: finalStatus,
      error: pipelineError ? pipelineError.message : null,
      updated_at: new Date().toISOString(),
    };
    if (pipelineResult?.resolvedEmail ?? emailGuess?.email) {
      patchPayload.extracted_email = pipelineResult?.resolvedEmail ?? emailGuess?.email;
    }

    const patchResult = await sbPatch(
      `webhook_events?provider=eq.${encodeURIComponent(provider)}&dedupe_key=eq.${encodeURIComponent(dedupeKey)}`,
      patchPayload,
    );
    if (!patchResult.ok) {
      console.error('Failed to update webhook event status', patchResult);
    }

    return res.status(200).json({
      ok: true,
      saved: true,
      status: finalStatus,
      email: pipelineResult?.resolvedEmail ?? emailGuess?.email ?? null,
      contact_id: pipelineResult?.contactId ?? null,
      manychat_contact_id: pipelineResult?.manychatContactId ?? contactId,
      event: pipelineResult?.event ?? typedPayload.event ?? null,
      error: pipelineError ? pipelineError.message : null,
    });
  } catch (error) {
    console.error('ManyChat webhook error', error);
    await postAlert(
      formatAlertPayload({
        severity: 'error',
        title: 'ManyChat webhook failed',
        message: (error as Error).message,
        meta: {
          requestId: (res as unknown as { reqId?: string })?.reqId ?? null,
        },
      }),
    );
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
