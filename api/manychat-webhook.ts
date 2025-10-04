import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractEmail, type EmailGuess } from '../lib/utils/extract.js';
import { extractLocationFromText } from '../lib/utils/location.js';
import {
  deriveName,
  deriveNameFromEmail,
  humanizeIdentifier,
  isBadName,
  sanitizeName,
} from '../lib/utils/name.js';
import { bestName } from '../lib/names.js';
import { parseFullName } from '../lib/names/parseFullName.js';
import { getDmText, makeDedupeKey } from '../lib/utils/payload.js';
import { resolveMlGroups } from '../lib/config/ml-groups.js';
import { sbInsert, sbPatch, sbReady, sbSelect } from '../lib/utils/sb.js';

console.log('[manychat-webhook] module loaded');

const MAILERLITE_API_KEY =
  process.env.MAILERLITE_API_KEY ?? process.env.MAILERLITE_TOKEN ?? process.env.ML_API_KEY;
const MAILERLITE_DEFAULT_NOTES =
  process.env.MAILERLITE_DEFAULT_NOTES ??
  process.env.DEFAULT_NOTES ??
  'Lead captured via Instagram DM';
const MAILERLITE_ENDPOINT = 'https://connect.mailerlite.com/api/subscribers';
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

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');


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
  const cleaned = raw
    .replace(/[\n\r]+/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,;\s]+|[,;\s]+$/g, '')
    .trim();
  if (!cleaned) return {};

  const leadingStopwords = new Set([
    'de',
    'del',
    'la',
    'el',
    'los',
    'las',
    'desde',
    'hermosa',
    'hermoso',
    'bella',
    'bello',
    'bonita',
    'bonito',
    'preciosa',
    'precioso',
    'linda',
    'lindo',
    'ciudad',
    'ciudadela',
    'pueblo',
  ]);

  const trailingStopwords = new Set(['de', 'del', 'la', 'el', 'las', 'los', 'desde']);

  const trimConnectors = (tokens: string[]): string[] => {
    const result = [...tokens];
    while (result.length) {
      const last = normalize(result[result.length - 1]);
      if (!last || trailingStopwords.has(last)) {
        result.pop();
        continue;
      }
      break;
    }

    while (result.length > 1) {
      const first = normalize(result[0]);
      if (!first || leadingStopwords.has(first)) {
        result.shift();
        continue;
      }
      break;
    }
    return result;
  };

  const sanitizeCityValue = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    const tokens = value.split(/\s+/).filter(Boolean);
    const trimmedTokens = trimConnectors(tokens);
    return trimmedTokens.length ? toTitleCase(trimmedTokens.join(' ')) : undefined;
  };

  const finalize = (cityCandidate?: string, countryCandidate?: string) => {
    let resolvedCity: string | undefined;
    let resolvedCountry: string | undefined;

    const applyCity = (value?: string) => {
      if (!value) return;
      const variants = new Set<string>();
      variants.add(value);
      for (const part of value.split(/[,;/]/)) {
        const trimmed = sanitizeCityValue(part.trim());
        if (trimmed) variants.add(trimmed);
      }
      for (const candidate of variants) {
        const cleanCandidate = sanitizeCityValue(candidate);
        if (!cleanCandidate) continue;
        const guess = extractLocationFromText(`vivo en ${cleanCandidate}`);
        if (guess?.city) {
          resolvedCity = guess.city;
          if (guess.country) resolvedCountry = resolvedCountry ?? guess.country;
          return;
        }
        const candidateCountry = matchCountryName(cleanCandidate);
        if (candidateCountry) {
          resolvedCountry = resolvedCountry ?? candidateCountry;
        }
      }
    };

    const applyCountry = (value?: string) => {
      if (!value) return;
      const variants = new Set<string>();
      variants.add(value);
      for (const part of value.split(/[,;/]/)) {
        const trimmed = part.trim();
        if (trimmed) variants.add(trimmed);
      }
      for (const candidate of variants) {
        const matched = matchCountryName(candidate);
        if (matched) {
          resolvedCountry = resolvedCountry ?? matched;
          return;
        }
      }
      const guess = extractLocationFromText(value);
      if (guess?.country) {
        resolvedCountry = resolvedCountry ?? guess.country;
      }
    };

    applyCity(cityCandidate);
    applyCountry(countryCandidate);

    if (resolvedCity && !resolvedCountry) {
      const inferred = matchCountryFromCity(resolvedCity);
      if (inferred) resolvedCountry = inferred;
    }

    const outcome: { city?: string; country?: string } = {};
    if (resolvedCity) outcome.city = resolvedCity;
    if (resolvedCountry) outcome.country = resolvedCountry;
    return outcome;
  };

  const attempt = (pairs: Array<[string | undefined, string | undefined]>) => {
    for (const [cityCandidate, countryCandidate] of pairs) {
      const result = finalize(cityCandidate, countryCandidate);
      if (result.city || result.country) {
        return result;
      }
    }
    return null;
  };

  const parts = cleaned.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const firstCity = sanitizeCityValue(parts[0]);
    const trailing = parts.slice(1).join(' ');
    const combos: Array<[string | undefined, string | undefined]> = [
      [firstCity, trailing],
      [sanitizeCityValue(parts[parts.length - 1]), parts.slice(0, parts.length - 1).join(' ')],
    ];
    for (const segment of parts) {
      combos.push([sanitizeCityValue(segment), undefined]);
      combos.push([undefined, segment]);
    }
    const resolved = attempt(combos);
    if (resolved) return resolved;
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length) {
    for (let split = tokens.length; split >= 1; split -= 1) {
      const citySlice = tokens.slice(0, split).join(' ');
      const countrySlice = tokens.slice(split).join(' ');
      const cityValue = sanitizeCityValue(citySlice);
      const resolved = finalize(cityValue, countrySlice);
      if (resolved.city || resolved.country) {
        return resolved;
      }
    }
  }

  const countryOnly = finalize(undefined, cleaned);
  if (countryOnly.city || countryOnly.country) return countryOnly;

  const cityOnly = finalize(sanitizeCityValue(cleaned), undefined);
  if (cityOnly.city || cityOnly.country) return cityOnly;

  return {};
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

const getFullContactData = (payload: ManyChatPayload | Record<string, unknown>): Record<string, unknown> | null => {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const candidate = raw.Full_Contact_Data ?? raw.full_contact_data ?? raw.fullContactData;
  if (!candidate) return null;
  if (Array.isArray(candidate)) {
    for (const entry of candidate) {
      if (entry && typeof entry === 'object') {
        return entry as Record<string, unknown>;
      }
    }
    return null;
  }
  if (typeof candidate === 'object') {
    return candidate as Record<string, unknown>;
  }
  return null;
};

const coerceContact = (payload: ManyChatPayload): ManyChatContact => {
  const contact = { ...(payload.contact ?? {}) } as ManyChatContact;
  const rawPayload = (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) as Record<string, unknown>;
  const fromPayload = (key: string) => fallbackString(payload, key);
  const fullContact = getFullContactData(payload);
  const fromFullContact = (key: string) =>
    fullContact && typeof fullContact === 'object' ? safetyString((fullContact as Record<string, unknown>)[key]) : undefined;

  contact.id = contact.id ?? fromPayload('contact_id');
  contact.name = contact.name ?? fromPayload('full_name');
  contact.first_name = contact.first_name ?? fromPayload('first_name');
  contact.last_name = contact.last_name ?? fromPayload('last_name');
  contact.email = contact.email ?? fromPayload('email') ?? fromPayload('subscriber_email');
  contact.phone = contact.phone ?? fromPayload('phone') ?? fromPayload('subscriber_phone');

  const fullContactIdRaw = fromFullContact('id') ?? fromFullContact('key');
  const fullContactId = fullContactIdRaw ? fullContactIdRaw.replace(/^user:/i, '') : undefined;
  contact.id = contact.id ?? fullContactId;
  contact.name = contact.name ?? fromFullContact('name');
  contact.first_name = contact.first_name ?? fromFullContact('first_name');
  contact.last_name = contact.last_name ?? fromFullContact('last_name');
  contact.email = contact.email ?? fromFullContact('email');
  contact.phone = contact.phone ?? fromFullContact('phone');

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

  if (!contact.emails && fromFullContact('email')) {
    contact.emails = [fromFullContact('email')!];
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

  const fullContactCustomFields = fullContact && typeof fullContact === 'object' ? (fullContact as Record<string, unknown>).custom_fields : undefined;
  if (fullContactCustomFields) {
    if (!contact.custom_fields) {
      contact.custom_fields = fullContactCustomFields as ManyChatCustomField;
    } else if (
      typeof contact.custom_fields === 'object' &&
      !Array.isArray(contact.custom_fields) &&
      typeof fullContactCustomFields === 'object' &&
      !Array.isArray(fullContactCustomFields)
    ) {
      contact.custom_fields = {
        ...(fullContactCustomFields as Record<string, unknown>),
        ...(contact.custom_fields as Record<string, unknown>),
      } as ManyChatCustomField;
    }
  }

  const fullContactIgUsername = fromFullContact('ig_username');
  const fullContactIgId = fromFullContact('ig_id');
  if (fullContactIgUsername) {
    const existingProfiles = contact.social_profiles ?? [];
    const alreadyPresent = existingProfiles.some((profile) => safetyString(profile?.username) === fullContactIgUsername);
    if (!alreadyPresent) {
      existingProfiles.push({ type: 'instagram', username: fullContactIgUsername, id: fullContactIgId });
      contact.social_profiles = existingProfiles;
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
  const fullContact = getFullContactData(payload);
  const fullContactKeyRaw = fullContact
    ? (fullContact as Record<string, unknown>).id ?? (fullContact as Record<string, unknown>).key
    : undefined;
  const normalizedFullId = (() => {
    const raw = safetyString(fullContactKeyRaw);
    if (!raw) return undefined;
    return raw.replace(/^user:/i, '');
  })();
  const { username: instagramUsername, id: instagramId } = extractInstagram(contact);
  const fallbackInstagramUsername = fallbackString(payload, 'instagram_username');
  const fallbackInstagramId = fallbackString(payload, 'instagram_id') ?? fallbackString(payload, 'instagram_user_id');
  const fullIgUsername = fullContact ? safetyString((fullContact as Record<string, unknown>).ig_username ?? (fullContact as Record<string, unknown>).username) : undefined;
  const fullIgId = fullContact ? safetyString((fullContact as Record<string, unknown>).ig_id ?? (fullContact as Record<string, unknown>).instagram_id) : undefined;

const customEmail = findCustomField(contact.custom_fields, [
  'email',
  'correo',
  'correo_electronico',
  'mail',
  'email_raw_from_first_dm',
  'email_from_first_dm',
  'email_dm',
  'correo_dm',
]);
const customPhone = findCustomField(contact.custom_fields, [
  'phone',
  'telefono',
  'celular',
  'whatsapp',
  'phone_raw_from_first_dm',
  'telefono_dm',
]);
  const customHandle = findCustomField(contact.custom_fields, [
    'instagram',
    'instagram_handle',
    'instagram_username',
    'ig_username',
  ]) ?? fallbackInstagramUsername ?? fullIgUsername;
  const customIgId = findCustomField(contact.custom_fields, ['instagram_id', 'ig_id']) ?? fallbackInstagramId ?? fullIgId;
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

  const payloadData =
    payload && typeof payload === 'object' && (payload as Record<string, unknown>).data &&
    typeof (payload as Record<string, unknown>).data === 'object'
      ? ((payload as Record<string, unknown>).data as Record<string, unknown>)
      : undefined;

  const readPayloadValue = (key: string): string | undefined => {
    const direct = fallbackString(payload, key);
    if (direct) return direct;
    if (payloadData) {
      const nested = safetyString(payloadData[key]);
      if (nested) return nested;
    }
    return undefined;
  };

  const fullContactEmail = fullContact ? safetyString((fullContact as Record<string, unknown>).email) : undefined;
  const rawEmail = safetyString(contact.email) ?? safetyString(contact.emails && pickFirst(contact.emails)) ?? fullContactEmail;
  const rawPhone = safetyString(contact.phone) ?? safetyString(contact.phones && pickFirst(contact.phones));

  const email = safetyString(customEmail ?? rawEmail ?? fallbackString(payload, 'contact_email'));
  const phone = safetyString(customPhone ?? rawPhone ?? fallbackString(payload, 'contact_phone'));
  const manychatId = safetyString(contact.id) ?? fallbackString(payload, 'contact_id') ?? normalizedFullId;

  const fullContactName = fullContact ? safetyString((fullContact as Record<string, unknown>).name) : undefined;
  const fullFirstName = fullContact ? safetyString((fullContact as Record<string, unknown>).first_name) : undefined;
  const fullLastName = fullContact ? safetyString((fullContact as Record<string, unknown>).last_name) : undefined;

  const guessFirstName = readPayloadValue('first_name_guess') ?? findCustomField(contact.custom_fields, ['first_name_guess']);
  const guessLastName = readPayloadValue('last_name_guess') ?? findCustomField(contact.custom_fields, ['last_name_guess']);

  const payloadFirstName = readPayloadValue('first_name');
  const payloadLastName = readPayloadValue('last_name');

  let resolvedFirstName =
    safetyString(contact.first_name) ??
    payloadFirstName ??
    fullFirstName ??
    undefined;
  let resolvedLastName =
    safetyString(contact.last_name) ??
    payloadLastName ??
    fullLastName ??
    undefined;

  if (!resolvedFirstName && guessFirstName) resolvedFirstName = guessFirstName;
  if (!resolvedLastName && guessLastName) resolvedLastName = guessLastName;

  const nameRawFirstReplyFromCustom = findCustomField(contact.custom_fields, ['name_raw_first_reply']);
  const fullContactCustom =
    fullContact && typeof fullContact === 'object'
      ? ((fullContact as Record<string, unknown>).custom_fields as ManyChatCustomField | undefined)
      : undefined;
  const nameRawFirstReplyFull = findCustomField(fullContactCustom, ['name_raw_first_reply']);
  const nameRawFirstReply =
    readPayloadValue('name_raw_first_reply') ??
    nameRawFirstReplyFromCustom ??
    nameRawFirstReplyFull;

  if ((!resolvedFirstName || !resolvedLastName) && nameRawFirstReply) {
    const parsed = parseFullName(nameRawFirstReply);
    if (parsed.hasSurname) {
      if (!resolvedFirstName && parsed.firstName) resolvedFirstName = parsed.firstName;
      if (!resolvedLastName && parsed.lastName) resolvedLastName = parsed.lastName;
    }
  }

  if (resolvedFirstName) {
    contact.first_name = resolvedFirstName;
  }
  if (resolvedLastName) {
    contact.last_name = resolvedLastName;
  }

  const assembledNameParts = [resolvedFirstName, resolvedLastName]
    .map((value) => (value ? safetyString(value) : undefined))
    .filter((part): part is string => Boolean(part));
  const assembledNameValue = assembledNameParts.length ? assembledNameParts.join(' ').trim() : undefined;
  const rawName =
    safetyString(contact.name) ??
    safetyString(assembledNameValue) ??
    fullContactName ??
    '';
  const name = sanitizeName(humanizeIdentifier(rawName) ?? rawName);

  const record: Record<string, unknown> = {
    manychat_contact_id: manychatId,
    name: name || undefined, // only if it passed sanitizeName
    first_name: resolvedFirstName ?? undefined,
    last_name: resolvedLastName ?? undefined,
    email,
    phone,
    country: safetyString(customCountry) ?? fallbackString(payload, 'country'),
    city: safetyString(customCity) ?? fallbackString(payload, 'city'),
    instagram_username: safetyString(customHandle) ?? instagramUsername ?? fullIgUsername,
    ig_user_id: safetyString(customIgId) ?? instagramId ?? fullIgId,
    ig_display_name: fullContactName ?? undefined,
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

  const fullContact = getFullContactData(payload);
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

  if (fullContact) {
    const fcRecord = fullContact as Record<string, unknown>;
    capture('name', safetyString(fcRecord.name), 'contact:full');
    capture('email', safetyString(fcRecord.email), 'contact:full');
    const customFields = fcRecord.custom_fields as Record<string, unknown> | undefined;
    const messageCandidate =
      safetyString(fcRecord.last_input_text) ||
      (customFields && typeof customFields === 'object'
        ? safetyString((customFields as Record<string, unknown>).last_dm_text)
        : undefined);
    if (messageCandidate) capture('message', messageCandidate, 'contact:full');
  }

  const assembledName =
    safetyString(contact?.name) ??
    [safetyString(contact?.first_name), safetyString(contact?.last_name)].filter(Boolean).join(' ').trim();
  const normalizedContactName = humanizeIdentifier(assembledName) ?? assembledName;
  if (normalizedContactName) capture('name', normalizedContactName, 'contact');
  capture('phone', safetyString(contact?.phone) ?? safetyString(contact?.phones && pickFirst(contact.phones)), 'contact');

const fieldCountry = findCustomField(contact?.custom_fields, ['country', 'pais', 'país']);
const fieldCity = findCustomField(contact?.custom_fields, ['city', 'ciudad', 'city_name', 'ciudad_residencia']);
const fieldEmail = findCustomField(contact?.custom_fields, [
  'email',
  'correo',
  'correo_electronico',
  'mail',
  'email_raw_from_first_dm',
  'email_from_first_dm',
  'email_dm',
  'correo_dm',
]);
capture('country', fieldCountry, 'custom_field');
capture('city', fieldCity, 'custom_field');
capture('email', fieldEmail, 'custom_field');

  const textCandidates = new Set<string>();
  const pushText = (value?: string) => {
    const safe = safetyString(value);
    if (safe) textCandidates.add(safe);
  };

  pushText(payload.message?.text);
  pushText(fallbackString(payload, 'last_text_input'));
  pushText(fallbackString(payload, 'message_text'));
  pushText(fallbackString(payload, 'text'));

  if (fullContact) {
    const fcRecord = fullContact as Record<string, unknown>;
    pushText(safetyString(fcRecord.last_input_text));
    const customFieldsRecord =
      fcRecord.custom_fields && typeof fcRecord.custom_fields === 'object'
        ? (fcRecord.custom_fields as Record<string, unknown>)
        : undefined;
    if (customFieldsRecord) {
      pushText(safetyString(customFieldsRecord.last_dm_text));
      const extraDmKeys = [
        'dm_buffer',
        'message_buffer',
        'mensaje_buffer',
        'mensaje_dm',
        'raw_dm_buffer',
        'dm_text_buffer',
      ];
      for (const key of extraDmKeys) {
        if (key in customFieldsRecord) {
          pushText(safetyString(customFieldsRecord[key]));
        }
      }
    }
  }

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
    /(?:vivo|resido|estoy|radico|me\s+encuentro)\s+(?:actualmente\s+)?(?:en|en\s+la\s+ciudad\s+de)\s+([a-záéíóúñü' ,\-]+?)(?:[.!?\n]|$)/i,
  );
  if (locationMatch) {
    applyLocationCandidate(locationMatch[1], 'text:heuristic');
  }

  const generalLocationMatch = text.match(
    /(?:de|desde|soy\s+de|somos\s+de|procedo\s+de|vengo\s+de|originario\s+de|originaria\s+de|nac[ií]\s+en|radico\s+en)\s+([a-záéíóúñü' ,\-]+?)(?:[.!?\n]|$)/i,
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

const OPTIONAL_CONTACT_COLUMNS = new Set(['ig_username', 'ig_display_name', 'name_source']);

const pruneOptionalColumns = (payload: Record<string, unknown>, errorMessage: string | undefined) => {
  if (!errorMessage) return false;
  let mutated = false;
  for (const column of OPTIONAL_CONTACT_COLUMNS) {
    if (errorMessage.includes(`'${column}'`) && column in payload) {
      delete payload[column];
      mutated = true;
    }
  }
  return mutated;
};

const fetchContactByColumn = async (column: string, value: string | undefined | null) => {
  const safe = safetyString(value);
  if (!safe) return null;
  const result = await sbSelect(
    `contacts?select=*&${column}=eq.${encodeURIComponent(safe)}&limit=1`,
  );
  if (!result.ok || !Array.isArray(result.json) || !result.json.length) {
    return null;
  }
  return result.json[0] as Record<string, unknown>;
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
    const message = typeof error === 'object' && error ? String((error as Record<string, unknown>).message ?? '') : String(error);
    const prunedRecord = { ...record };
    if (pruneOptionalColumns(prunedRecord, message)) {
      return insertContact(prunedRecord);
    }
    throw new Error(`Supabase contacts upsert failed: ${JSON.stringify(error)}`);
  }

  if (!Array.isArray(body) || !body.length) {
    throw new Error('Supabase contacts upsert returned empty response');
  }

  return body[0];
};

const patchContactByEmail = async (email: string | undefined, patch: Record<string, unknown>) => {
  if (!email || !email.trim()) return;
  if (!patch || !Object.keys(patch).length) return;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/contacts?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        ...jsonHeaders,
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    });
    if (response.ok) return;
    const text = await response.text();
    const message = text || String(response.status);
    if (pruneOptionalColumns(patch, message)) {
      await patchContactByEmail(email, patch);
      return;
    }
    if (response.status >= 500) {
      throw new Error(`Supabase contact patch failed (status ${response.status})`);
    }
    console.warn('Supabase contact patch failed', response.status, message);
  } catch (error) {
    console.warn('patchContactByEmail failed', error);
  }
};

const fetchContactByEmail = async (email: string | undefined) => {
  return fetchContactByColumn('email', email);
};

const fetchContactByManychatId = async (manychatId: string | undefined | null) =>
  fetchContactByColumn('manychat_contact_id', manychatId);

const fetchContactByIgUserId = async (igUserId: string | undefined | null) =>
  fetchContactByColumn('ig_user_id', igUserId);

const fetchContactByInstagramUsername = async (username: string | undefined | null) =>
  fetchContactByColumn('instagram_username', username);

const fetchContactByIgUsername = async (username: string | undefined | null) =>
  fetchContactByColumn('ig_username', username);

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

type MailerLiteUpsertInput = {
  email?: string;
  name?: string;
  country?: string;
  city?: string;
  phone?: string;
  message?: string;
  instagramUsername?: string;
  manychatId?: string;
  fields?: Record<string, string>;
  groups?: string[];
};

type MailerLiteSyncResult = {
  ok: true;
  status: number;
  json: unknown;
  groupsSent: string[];
  keyFp: string;
};

const getMailerLiteKey = () =>
  process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || process.env.ML_API_KEY || '';

const mailerLiteKeyFingerprint = (key: string) => (key ? key.slice(-6) : '');

const looksLikePlaceholder = (value: string) =>
  /\{\{|\}\}|%7B%7B|%7D%7D|<[^>]*>|\[[^\]]*\]/i.test(value);

const normalizeNameSource = (source: string | undefined): 'instagram_full_name' | 'instagram_handle_titlecase' | 'email_local' | 'manual' | 'unknown' => {
  switch (source) {
    case 'instagram_full_name':
    case 'instagram_handle_titlecase':
    case 'email_local':
    case 'manual':
    case 'unknown':
      return source;
    case 'ig_full_name':
      return 'instagram_full_name';
    case 'ig_username':
      return 'instagram_handle_titlecase';
    case 'dm_text':
      return 'manual';
    default:
      return 'unknown';
  }
};

const mailerliteUpsert = async (input: MailerLiteUpsertInput): Promise<MailerLiteSyncResult | undefined> => {
  const key = getMailerLiteKey();
  if (!key) {
    console.warn('MailerLite sync skipped: missing MAILERLITE_API_KEY/MAILERLITE_TOKEN');
    return undefined;
  }

  const email = safetyString(input.email);
  if (!email) {
    console.warn('MailerLite sync skipped: no email detected');
    return undefined;
  }

  const groupsSource = Array.isArray(input.groups) && input.groups.length ? input.groups : resolveMlGroups();
  const groups = Array.from(
    new Set(
      groupsSource
        .map((value) => String(value).trim())
        .filter((value) => /^\d{5,}$/.test(value)),
    ),
  );

  if (!groups.length) {
    throw new Error('MailerLite sync aborted: no group IDs resolved (check resolveMlGroups configuration)');
  }

  const fields: Record<string, string> = {};
  if (input.country) fields.country = input.country;
  if (input.city) fields.city = input.city;
  if (input.phone) fields.phone = input.phone;
  if (input.instagramUsername) fields.instagram = input.instagramUsername;

  for (const [keyName, value] of Object.entries(input.fields ?? {})) {
    if (typeof value === 'string' && value.trim()) {
      fields[keyName] = value.trim();
    }
  }

  const initialName = sanitizeName(input.name);
  const safeName = initialName && !looksLikePlaceholder(initialName) ? initialName : undefined;
  const { first: firstName } = splitName(safeName);
  if (safeName) fields.name = safeName;
  if (firstName) {
    fields.first_name = firstName;
    if (!fields.name) fields.name = firstName;
  }

  const notesParts: string[] = [];
  if (MAILERLITE_DEFAULT_NOTES) notesParts.push(MAILERLITE_DEFAULT_NOTES);
  if (input.message) notesParts.push(input.message);
  if (input.manychatId) notesParts.push(`ManyChat ID: ${input.manychatId}`);
  if (notesParts.length) fields.notas = notesParts.join(' - ');

  if (fields.name && looksLikePlaceholder(fields.name)) {
    delete fields.name;
  }

  if ('last_name' in fields) {
    delete fields.last_name;
  }

  for (const key of Object.keys(fields)) {
    const value = String(fields[key] ?? '').trim();
    if (!value || looksLikePlaceholder(value)) {
      delete fields[key];
    }
  }

  const payload: Record<string, unknown> = {
    email,
    resubscribe: true,
    groups,
  };

  if (safeName || firstName) {
    payload.name = safeName ?? firstName;
  }

  if (Object.keys(fields).length) {
    payload.fields = fields;
  }

  const response = await fetch(MAILERLITE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { raw: text };
    }
  }

  const successResult: MailerLiteSyncResult = {
    ok: true,
    status: response.status,
    json: data,
    groupsSent: groups,
    keyFp: mailerLiteKeyFingerprint(key),
  };

  if (response.ok) {
    return successResult;
  }

  if (response.status === 409) {
    console.warn('MailerLite reported existing subscriber conflict; treating as success', data);
    return successResult;
  }

  if (response.status === 422) {
    const errors = Array.isArray((data as { errors?: unknown }).errors)
      ? ((data as { errors: Array<{ message?: string }> }).errors as Array<{ message?: string }> )
      : [];
    const duplicateEmail = errors.find(
      (err) => typeof err?.message === 'string' && err.message.toLowerCase().includes('already'),
    );
    if (duplicateEmail) {
      console.warn('MailerLite reports subscriber already exists; update skipped', data);
      return successResult;
    }
  }

  const error = new Error(`Mailerlite ${response.status}`);
  (error as Error & { response?: Record<string, unknown> }).response = {
    status: response.status,
    body: data,
    groups,
    keyFp: successResult.keyFp,
  };
  throw error;
};

export type PipelineResult = {
  contactId: string;
  manychatContactId: string;
  event: string | null;
  resolvedEmail?: string;
  matchedSources: string[];
  mailerlite?: MailerLiteSyncResult;
  finalName?: string | null;
  finalNameSource?: string;
  contactRecord: Record<string, unknown>;
  contactPatch?: Record<string, unknown> | null;
  mailerlitePlan?: MailerLiteUpsertInput;
};

export const executePipeline = async (
  payload: ManyChatPayload,
  emailGuess?: EmailGuess | null,
  context: {
    dmText?: string;
    igProfileName?: string;
    igUsername?: string;
    dryRun?: boolean;
    simulate?: boolean;
  } = {},
): Promise<PipelineResult> => {
  const { record, contact } = extractContactRecord(payload);
  const parsedLead = parseLeadDetails(payload, contact);
  const dryRun = Boolean(context.dryRun);
  const simulate = Boolean(context.simulate);
  let mailerliteResult: MailerLiteSyncResult | undefined;

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
  const igProfileName = context.igProfileName ?? '';
  const igUsername = context.igUsername ?? '';
  const bestCandidate = bestName({
    fullName: igProfileName,
    username: igUsername,
    email:
      emailGuess?.email ??
      parsedLead.email ??
      (typeof record.email === 'string' ? record.email : undefined),
  });
  const bestClean = bestCandidate.name ? sanitizeName(bestCandidate.name) : undefined;
  const locationGuess = extractLocationFromText(dmText);
  const locationScore = locationGuess?.score ?? 0;
  if (locationGuess?.city && locationScore >= 0.6 && !parsedLead.city) parsedLead.city = locationGuess.city;
  if (locationGuess?.country && locationScore >= 0.6 && !parsedLead.country) parsedLead.country = locationGuess.country;
  if (locationGuess?.city && locationScore >= 0.6 && !record.city) record.city = locationGuess.city;
  if (locationGuess?.country && locationScore >= 0.6 && !record.country) record.country = locationGuess.country;

  const nameGuess = deriveName({
    igProfileName,
    igUsername,
    dmText,
    email: emailGuess?.email ?? parsedLead.email ?? (typeof record.email === 'string' ? record.email : undefined),
  });

  const deriveClean =
    nameGuess.value && !isBadName(nameGuess.value) && nameGuess.score >= 0.6 ? nameGuess.value : undefined;
  if (!deriveClean && nameGuess.value) {
    console.log('name.placeholder_blocked', { raw: nameGuess.value, source: nameGuess.source });
  }
  if (bestCandidate.name && (!bestClean || isBadName(bestCandidate.name))) {
    console.log('name.best_blocked', { raw: bestCandidate.name, source: bestCandidate.source });
  }

  let finalName = deriveClean ?? undefined;
  let finalSource = normalizeNameSource(nameGuess.source as string | undefined);

  if (bestClean && !isBadName(bestClean)) {
    finalName = bestClean;
    finalSource = normalizeNameSource(bestCandidate.source);
  } else if (!finalName && bestCandidate.name && !isBadName(bestCandidate.name)) {
    finalName = bestCandidate.name;
    finalSource = normalizeNameSource(bestCandidate.source);
  }

  const finalNameSource = finalName ? finalSource : 'unknown';

  if (finalName) {
    parsedLead.name = finalName;
    record.name = finalName;
    record.name_source = finalSource;
  }
  record.name_source = (record.name_source as string | undefined) ?? (finalName ? finalSource : 'unknown');

  if (igUsername) {
    record.ig_username = igUsername;
  }
  if (igProfileName) {
    record.ig_display_name = igProfileName;
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
  }
  const finalNameTokens = parsedLead.name ? parsedLead.name.split(/\s+/).filter(Boolean) : [];
  if (finalNameTokens.length) {
    record.first_name = finalNameTokens[0];
    record.last_name = finalNameTokens.length > 1 ? finalNameTokens.slice(1).join(' ') : undefined;
  }
  if (parsedLead.message) {
    record.notes = parsedLead.message;
  }

  const manychatContactId = safetyString(record.manychat_contact_id);
  if (!manychatContactId) {
    throw new Error('Missing ManyChat contact id');
  }

  let contactRow: Record<string, unknown> | null = null;
  if (dryRun) {
    contactRow = { id: 'dry-contact', ...record };
  } else {
    try {
      contactRow = await insertContact(record);
    } catch (contactError) {
      const message = (contactError as Error).message || '';
      const isUniqueViolation =
        /duplicate key value/i.test(message) ||
        message.includes('already exists') ||
        message.includes('on_conflict');
      if (!isUniqueViolation) {
        throw contactError;
      }

      const igUserIdValue = safetyString(record.ig_user_id);
      const instagramUsernameValue = safetyString((record as Record<string, unknown>).instagram_username);
      const igUsernameValue = safetyString((record as Record<string, unknown>).ig_username);
      const manychatIdValue = manychatContactId;
      const emailValue = safetyString(record.email);

      type MatchStrategy =
        | 'ig_user_id'
        | 'instagram_username'
        | 'ig_username'
        | 'manychat_contact_id'
        | 'email'
        | 'unknown';

      const lookupOrder: Array<{ finder: () => Promise<Record<string, unknown> | null>; reason: MatchStrategy }> = [];

      if (igUserIdValue) {
        lookupOrder.push({ finder: () => fetchContactByIgUserId(igUserIdValue), reason: 'ig_user_id' });
      }
      if (instagramUsernameValue) {
        lookupOrder.push({ finder: () => fetchContactByInstagramUsername(instagramUsernameValue), reason: 'instagram_username' });
      }
      if (igUsernameValue) {
        lookupOrder.push({ finder: () => fetchContactByIgUsername(igUsernameValue), reason: 'ig_username' });
      }
      if (manychatIdValue) {
        lookupOrder.push({ finder: () => fetchContactByManychatId(manychatIdValue), reason: 'manychat_contact_id' });
      }
      if (emailValue) {
        lookupOrder.push({ finder: () => fetchContactByEmail(emailValue), reason: 'email' });
      }

      let existingContact: Record<string, unknown> | null = null;
      let matchedBy: MatchStrategy = 'unknown';
      for (const { finder, reason } of lookupOrder) {
        existingContact = await finder();
        if (existingContact) {
          matchedBy = reason;
          break;
        }
      }

      if (!existingContact) {
        throw contactError;
      }

      contactRow = existingContact;

      const existingName = safetyString((existingContact as Record<string, unknown>).name);
      const existingNameSource =
        safetyString((existingContact as Record<string, unknown>).name_source) ?? 'unknown';
      const existingIgUsername =
        safetyString((existingContact as Record<string, unknown>).ig_username) ??
        safetyString((existingContact as Record<string, unknown>).instagram_username);
      const allowUpdateExistingName =
        !existingName || existingName === existingIgUsername || existingNameSource !== 'manual';

      try {
        const patchPayload = { ...record } as Record<string, unknown>;
        if (!allowUpdateExistingName) {
          delete patchPayload.name;
          delete patchPayload.name_source;
          delete patchPayload.first_name;
          delete patchPayload.last_name;
        }

        if (!patchPayload.updated_at) {
          patchPayload.updated_at = new Date().toISOString();
        }

        const targetId = safetyString((existingContact as Record<string, unknown>).id);
        if (!targetId) {
          console.warn('Duplicate contact reconciliation missing target id', existingContact);
        } else {
          let patchResponse = await sbPatch(
            `contacts?id=eq.${encodeURIComponent(targetId)}`,
            patchPayload,
          );
          if (!patchResponse.ok) {
            const failureMessage = String(
              (patchResponse.json as Record<string, unknown>)?.message ?? patchResponse.status,
            );
            if (pruneOptionalColumns(patchPayload, failureMessage)) {
              patchResponse = await sbPatch(
                `contacts?id=eq.${encodeURIComponent(targetId)}`,
                patchPayload,
              );
            }
          }

          if (!patchResponse.ok) {
            console.warn('Failed to patch contact after duplicate match', {
              matched_by: matchedBy,
              response: patchResponse,
            });
          } else {
            contactRow = { ...existingContact, ...patchPayload };
          }
        }
      } catch (patchError) {
        console.warn('Failed to patch contact after duplicate match', patchError);
      }
    }

    if (!contactRow) {
      throw new Error('Supabase contact insert failed without fallback');
    }
  }

  const currentName = safetyString((contactRow as Record<string, unknown>).name);
  const currentNameSource =
    safetyString((contactRow as Record<string, unknown>).name_source) ?? 'unknown';
  const currentIgUsername =
    safetyString((contactRow as Record<string, unknown>).ig_username) ??
    safetyString((contactRow as Record<string, unknown>).instagram_username);
  const allowUpdateName =
    !currentName ||
    currentName === currentIgUsername ||
    currentNameSource !== 'manual' ||
    (finalName && finalNameSource !== 'manual');

  const resolvedEmail =
    parsedLead.email ??
    safetyString((contactRow as Record<string, unknown>).email) ??
    safetyString(record.email);
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
  const mailerFields: Record<string, string> = {};
  if (finalName) mailerFields.name = finalName;
  if (locationGuess?.city && locationScore >= 0.6) mailerFields.city = locationGuess.city;
  if (locationGuess?.country && locationScore >= 0.6) mailerFields.country = locationGuess.country;
  if (resolvedPhone) mailerFields.phone = resolvedPhone;
  if (resolvedInstagram) mailerFields.instagram = resolvedInstagram;

  let contactPatchPlan: Record<string, unknown> | null = null;

  if (resolvedEmail) {
    const patchPayload: Record<string, unknown> = {};
    if (allowUpdateName && finalName) {
      patchPayload.name = finalName;
      patchPayload.name_source = finalNameSource;
      patchPayload.first_name = finalNameTokens[0] ?? null;
      patchPayload.last_name = finalNameTokens.length > 1 ? finalNameTokens.slice(1).join(' ') : null;
    }
    if (igUsername) {
      patchPayload.ig_username = igUsername;
    }
    if (igProfileName) {
      patchPayload.ig_display_name = igProfileName;
    }
    if (locationGuess?.city && locationScore >= 0.6 && !safetyString((contactRow as Record<string, unknown>).city)) {
      patchPayload.city = locationGuess.city;
    }
    if (locationGuess?.country && locationScore >= 0.6 && !safetyString((contactRow as Record<string, unknown>).country)) {
      patchPayload.country = locationGuess.country;
    }
    if (Object.keys(patchPayload).length) {
      contactPatchPlan = { ...patchPayload };
      if (!dryRun) {
        await patchContactByEmail(resolvedEmail, patchPayload);
      }
    }
  }

  const platformHint = resolvedInstagram || safetyString(record.ig_user_id) ? 'instagram' : 'other';

  if (!dryRun) {
    try {
      await insertInteraction(contactRow.id as string, payload, platformHint, resolvedManychatId, parsedLead);
    } catch (interactionError) {
      console.error('Failed to insert interaction', interactionError);
    }
  }

  const mlGroups = resolveMlGroups();

  const mailerlitePlan: MailerLiteUpsertInput = {
    email: resolvedEmail,
    name: finalName ?? undefined,
    country: resolvedCountry,
    city: resolvedCity,
    phone: resolvedPhone,
    message: parsedLead.message,
    instagramUsername: resolvedInstagram,
    manychatId: resolvedManychatId,
    fields: Object.keys(mailerFields).length ? { ...mailerFields } : undefined,
    groups: mlGroups,
  };

  if (!dryRun) {
    try {
      mailerliteResult = await mailerliteUpsert(mailerlitePlan);
    } catch (mailerliteError) {
      if (!simulate) {
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
      }
      throw mailerliteError;
    }
  }

  const contactRecordPlan = { ...record };

  const eventName = payload.event ?? null;
  console.log('ManyChat webhook processed', {
    contact_id: contactRow.id,
    manychat_contact_id: manychatContactId,
    event: eventName,
    parsed: parsedLead.matched,
    name_source: finalNameSource,
    final_name: finalName,
  });

  return {
    contactId: contactRow.id as string,
    manychatContactId: manychatContactId,
    event: eventName,
    resolvedEmail: resolvedEmail ?? undefined,
    matchedSources: parsedLead.matched,
    mailerlite: mailerliteResult,
    finalName: finalName ?? null,
    finalNameSource,
    contactRecord: contactRecordPlan,
    contactPatch: contactPatchPlan,
    mailerlitePlan,
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
  const simulateQuery = req.query?.simulate;
  const dryQuery = req.query?.dry;
  const simulateFlag = Array.isArray(simulateQuery) ? simulateQuery.includes('1') : simulateQuery === '1';
  const dryFlag = Array.isArray(dryQuery) ? dryQuery.includes('1') : dryQuery === '1';
  const debugHeaderRaw = req.headers['x-debug-token'];
  const debugToken = Array.isArray(debugHeaderRaw) ? debugHeaderRaw[0] : debugHeaderRaw;
  const hasDebugToken = Boolean(process.env.DEBUG_TOKEN);
  const validDebugToken = hasDebugToken && debugToken === process.env.DEBUG_TOKEN;
  if (simulateFlag && !validDebugToken) {
    return res.status(401).json({ error: 'bad debug token' });
  }
  try {
    console.log('[manychat-webhook] method:', req.method);

    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(204).end();
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    if (!simulateFlag && !validateSecret(req)) {
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

    if (!sbReady() && !dryFlag) {
      return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
    }

    const typedPayload = payload as ManyChatPayload;
    const rawPayload = typedPayload as any;
    const dmText = getDmText(rawPayload);
    const emailGuess = extractEmail(dmText);
    const fullContactTop = getFullContactData(rawPayload);
    const igProfileNameTop =
      safetyString(rawPayload?.full_name) ??
      safetyString(rawPayload?.subscriber?.name) ??
      safetyString(rawPayload?.subscriber?.full_name) ??
      (fullContactTop ? safetyString((fullContactTop as Record<string, unknown>).name) : undefined) ??
      '';
    const igUsernameTop =
      safetyString(rawPayload?.instagram_username) ??
      safetyString(rawPayload?.subscriber?.username) ??
      (fullContactTop
        ? safetyString(
            (fullContactTop as Record<string, unknown>).ig_username ??
              (fullContactTop as Record<string, unknown>).username,
          )
        : undefined) ??
      '';

    const rawContactId =
      safetyString(typedPayload.contact?.id) ??
      fallbackString(typedPayload, 'contact_id') ??
      safetyString((typedPayload as Record<string, unknown>).contact_id) ??
      safetyString((typedPayload as Record<string, unknown>).subscriber && (typedPayload as any)?.subscriber?.id) ??
      (fullContactTop
        ? (() => {
            const rawId = safetyString(
              (fullContactTop as Record<string, unknown>).id ??
                (fullContactTop as Record<string, unknown>).key,
            );
            return rawId ? rawId.replace(/^user:/i, '') : undefined;
          })()
        : undefined);
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

    let persisted = true;
    if (!dryFlag) {
      const saveResult = await sbInsert('webhook_events', eventRow);
      persisted = saveResult.ok || saveResult.status === 409;
      if (!persisted) {
        console.error('Failed to persist webhook event', saveResult);
        return res.status(500).json({ ok: false, error: 'persist_failed', detail: saveResult.json });
      }
    }

    let finalStatus: 'PROCESSED' | 'FAILED' = 'PROCESSED';
    let pipelineError: Error | null = null;
    let pipelineResult: PipelineResult | null = null;
    let mlDebugPayload: { groups?: string[]; key_fp?: string; body?: unknown; plan?: MailerLiteUpsertInput | null } | undefined;

    try {
      pipelineResult = await executePipeline(typedPayload, emailGuess, {
        dmText,
        igProfileName: igProfileNameTop,
        igUsername: igUsernameTop,
        dryRun: dryFlag,
        simulate: simulateFlag,
      });
    } catch (error) {
      finalStatus = 'FAILED';
      pipelineError = error as Error;
      console.error('ManyChat pipeline execution failed', error);
      if (!simulateFlag) {
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
    }

    const patchPayload: Record<string, unknown> = {
      status: finalStatus,
      error: pipelineError ? pipelineError.message : null,
      updated_at: new Date().toISOString(),
    };
    if (pipelineResult?.resolvedEmail ?? emailGuess?.email) {
      patchPayload.extracted_email = pipelineResult?.resolvedEmail ?? emailGuess?.email;
    }

    if (!dryFlag) {
      const patchResult = await sbPatch(
        `webhook_events?provider=eq.${encodeURIComponent(provider)}&dedupe_key=eq.${encodeURIComponent(dedupeKey)}`,
        patchPayload,
      );
      if (!patchResult.ok) {
        console.error('Failed to update webhook event status', patchResult);
      }
    }

    const queryDebug = req.query?.debug as string | string[] | undefined;
    const debugFromQuery = Array.isArray(queryDebug) ? queryDebug.includes('1') : queryDebug === '1';
    const headerDebugRaw = req.headers['x-debug'];
    const debugFromHeader = Array.isArray(headerDebugRaw) ? headerDebugRaw.includes('1') : headerDebugRaw === '1';
    const hasDebugFlag = debugFromQuery || debugFromHeader;
    const debugMode = hasDebugFlag && (!process.env.API_TOKEN || req.headers['x-api-token'] === process.env.API_TOKEN);

    const mlErrorResponse = (pipelineError as Error & {
      response?: { status?: number; body?: unknown; groups?: string[]; keyFp?: string };
    })?.response;

    if (debugMode) {
      if (mlErrorResponse) {
        mlDebugPayload = {
          groups: mlErrorResponse.groups,
          key_fp: mlErrorResponse.keyFp,
          body: mlErrorResponse.body,
        };
      } else if (pipelineResult?.mailerlite) {
        mlDebugPayload = {
          groups: pipelineResult.mailerlite.groupsSent,
          key_fp: pipelineResult.mailerlite.keyFp,
        };
      } else if (pipelineResult?.mailerlitePlan) {
        mlDebugPayload = {
          groups: pipelineResult.mailerlitePlan.groups,
          key_fp: pipelineResult.mailerlite?.keyFp,
          plan: pipelineResult.mailerlitePlan,
        };
      }
    }

    let errorMessage: string | null = null;
    if (pipelineError) {
      if (mlErrorResponse?.status) {
        errorMessage = `MailerLite sync failed (status ${mlErrorResponse.status})`;
      } else {
        errorMessage = pipelineError.message || 'MailerLite sync failed';
      }
    }

    if (simulateFlag) {
      return res.status(200).json({
        dry: dryFlag,
        finalName: pipelineResult?.finalName ?? null,
        name_source: pipelineResult?.finalNameSource ?? 'unknown',
        would_write: pipelineResult?.contactPatch ?? pipelineResult?.contactRecord ?? null,
        mailerlite_plan: pipelineResult?.mailerlitePlan ?? null,
      });
    }

    const responsePayload: Record<string, unknown> = {
      ok: true,
      saved: true,
      status: finalStatus,
      email: pipelineResult?.resolvedEmail ?? emailGuess?.email ?? null,
      contact_id: pipelineResult?.contactId ?? null,
      manychat_contact_id: pipelineResult?.manychatContactId ?? contactId,
      event: pipelineResult?.event ?? typedPayload.event ?? null,
      error: errorMessage,
    };

    if (mlDebugPayload) {
      responsePayload.ml_debug = mlDebugPayload;
    }

    return res.status(200).json(responsePayload);
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
