import { createHash } from 'node:crypto';

export const CRM_VNEXT_FACT_INTAKE_SCHEMA_VERSION = 'crm-vnext-fact-intake-2026-05-09' as const;

export type CrmFactSourceKind =
  | 'alejandro_conversation'
  | 'telegram_human_report'
  | 'mailerlite_tag_snapshot'
  | 'instagram_signal'
  | 'manual_import'
  | 'unknown';

export type CrmFactType =
  | 'program_participation'
  | 'retreat_attendance'
  | 'community_event_attendance'
  | 'expressed_interest'
  | 'client_status'
  | 'purchase'
  | 'identity_update'
  | 'note';

export type CrmFactPersonHint = {
  rawName: string | null;
  email: string | null;
  instagramHandle: string | null;
  phone: string | null;
  personIdHint: string | null;
};

export type CrmFactEvent = {
  factId: string;
  type: CrmFactType;
  person: CrmFactPersonHint;
  subject: {
    program: string | null;
    product: string | null;
    eventName: string | null;
    role: string | null;
    status: string | null;
  };
  observedAt: string;
  occurredAt: string | null;
  source: {
    kind: CrmFactSourceKind;
    reporter: string | null;
    channel: string | null;
  };
  confidence: 'high' | 'medium' | 'low';
  requiresHumanReview: boolean;
  evidenceText: string;
  suggestedCardPatch: {
    evidence: {
      source: string;
      observedAt: string;
      note: string;
    };
    tags: string[];
    scoringHints: {
      participation?: {
        yogaClasses90d?: number;
        happyCircle90d?: number;
        retreatsAttended?: number;
      };
      purchases?: {
        purchaseCount?: number;
        activeClient?: boolean;
        retreatsPurchased?: number;
        digitalProductsPurchased?: number;
        mentorshipSessions?: number;
        therapySessions?: number;
      };
    };
  };
};

export type CrmFactIntakeDraft = {
  schemaVersion: typeof CRM_VNEXT_FACT_INTAKE_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'dry_run_fact_intake';
  input: {
    text: string;
    sourceKind: CrmFactSourceKind;
    reporter: string | null;
    channel: string | null;
  };
  facts: CrmFactEvent[];
  ambiguities: Array<{
    code: string;
    line: string;
    detail: string;
  }>;
  summary: {
    linesParsed: number;
    facts: number;
    people: number;
    requiresHumanReview: number;
    factTypes: Record<CrmFactType, number>;
  };
  safety: {
    dryRun: true;
    outboundProhibited: true;
    recordMutationProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmFactIntakeInput = {
  text: string;
  sourceKind?: CrmFactSourceKind | null;
  reporter?: string | null;
  channel?: string | null;
  observedAt?: string | Date | null;
  occurredAt?: string | Date | null;
};

const FACT_TYPES: CrmFactType[] = [
  'program_participation',
  'retreat_attendance',
  'community_event_attendance',
  'expressed_interest',
  'client_status',
  'purchase',
  'identity_update',
  'note',
];

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hashId = (parts: string[]): string =>
  createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);

const splitFactClauses = (line: string): string[] => {
  const cleaned = line.replace(/^(crm|mantis)\s*:\s*/i, '').trim();
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?])\s+(?=@[a-z0-9._]{2,30}\b|[A-ZÁÉÍÓÚÑ])/)
    .map((item) => item.replace(/[.!?]+$/g, '').trim())
    .filter(Boolean);
};

const splitLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .flatMap((line) => splitFactClauses(line.trim()))
    .filter(Boolean);

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const handleRegex = /(?:^|\s)@([a-z0-9._]{2,30})\b/gi;
const phoneRegex = /(?:\+?\d[\d\s().-]{6,}\d)/g;

const extractFirst = (regex: RegExp, line: string): string | null => {
  regex.lastIndex = 0;
  const match = regex.exec(line);
  return match?.[1] || match?.[0]?.trim() || null;
};

const looksLikeDateOrTimestamp = (value: string): boolean => {
  const trimmed = value.trim();
  if (
    /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])(?:[T\s]+(?:[01]?\d|2[0-3])(?::?[0-5]\d){0,2})?\b/.test(trimmed)
  ) {
    return true;
  }
  const digits = trimmed.replace(/\D/g, '');
  return /^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:[01]\d|2[0-3])?(?:[0-5]\d){0,2}$/.test(digits);
};

const normalizePhoneCandidate = (value: string): string | null => {
  if (looksLikeDateOrTimestamp(value)) return null;
  const cleaned = value.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (/^(\d)\1+$/.test(digits)) return null;
  return cleaned;
};

const extractPhone = (line: string): string | null => {
  phoneRegex.lastIndex = 0;
  for (const match of line.matchAll(phoneRegex)) {
    const phone = normalizePhoneCandidate(match[0]);
    if (phone) return phone;
  }
  return null;
};

const removeIdentityFragments = (value: string): string =>
  value
    .replace(emailRegex, '')
    .replace(handleRegex, '')
    .replace(phoneRegex, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanPersonNameCandidate = (value: string): string | null => {
  let cleaned = value
    .replace(/[.!?]+$/g, '')
    .replace(/,$/g, '')
    .trim();
  if (!cleaned) return null;

  cleaned = cleaned
    .replace(/^(?:tambien|también)\s+(?:tenemos\s+a|esta|está)\s+/i, '')
    .replace(/^tenemos\s+(?:tambien|también)?\s*a\s+/i, '')
    .replace(/^(?:tambien|también)\s+esta\s+/i, '')
    .replace(/^(?:tambien|también)\s+está\s+/i, '')
    .replace(/\s*,?\s+que$/i, '')
    .trim();

  const normalized = normalize(cleaned);
  if (
    !cleaned
    || /^(que|tambien|también|tenemos|esta|está)$/i.test(cleaned)
    || /^es\s+hij[ao]\s+de\b/i.test(cleaned)
    || /^hij[ao]\s+de\b/i.test(cleaned)
    || /^(vive|trabaja|asiste|entra|ha|han|tiene|tienen)\b/i.test(cleaned)
    || /^(nueva\s+york|medellin|medellín|cundinamarca|el\s+rosal)$/i.test(cleaned)
    || /\b(estudiante|alumn|asistente|clases?|retiros?|paciente|cliente|programa|producto|emails?|correos?)\b/i.test(normalized)
  ) {
    return null;
  }

  return cleaned;
};

const splitPeople = (peopleText: string): string[] => {
  const withoutIdentities = removeIdentityFragments(peopleText)
    .replace(/\b(mi|mis|la|el|los|las|estas|estos)\b/gi, ' ')
    .replace(/\b(?:ha|han)\s+$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!withoutIdentities) return [];

  return withoutIdentities
    .split(/\s*(?:,|;|\sy\s|\se\s|\+|&)\s*/i)
    .map((item) => cleanPersonNameCandidate(item.trim()))
    .filter((item): item is string => Boolean(item && item.length >= 2))
    .filter((item) => !/^(hoy|ayer|manana|mañana|personas|gente)$/i.test(item));
};

const peopleBeforeVerb = (line: string): string[] => {
  const introMatch = line.match(/^(?:tambien|también)?\s*tenemos\s+(?:tambien|también)?\s*a\s+([^.,;]+)/i)
    ?? line.match(/^(?:tambien|también)\s+(?:esta|está)\s+([^.,;]+)/i);
  if (introMatch?.[1]) return splitPeople(introMatch[1]);

  const match = line.match(
    /^(.+?)\s+(?:son|es|estan|están|esta|está|asiste|asisten|asistieron|asistio|asistió|ha\s+asistido|han\s+asistido|vinieron|vino|participan|participaron|participo|participó|ha\s+participado|han\s+participado|entra|entran|empezaron|empezo|empezó|compraron|compro|compró|pidieron|pidio|pidió|quieren|quiere|tienen|tiene)\b/i,
  );
  if (!match) return [];
  return splitPeople(match[1]);
};

const isPlausibleAlias = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = normalize(value);
  if (
    /\b(estudiante|clase|clases|yoga|retiro|retiros|paciente|cliente|clienta|amigo|amiga|aliado|aliada|consultor|consultora|familia|interesad)\b/i.test(normalized)
  ) {
    return false;
  }
  const words = value.replace(/\s*\/\s*/g, ' ').split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 6 && words.every((word) => /[a-záéíóúñ]/i.test(word));
};

const aliasAfterHandle = (line: string): string | null => {
  const match = line.match(/@[a-z0-9._]{2,30}\s+(?:es|se llama)\s+([^,.;]+)/i);
  const alias = cleanString(match?.[1]);
  return isPlausibleAlias(alias) ? alias : null;
};

const isReviewOnlyEmailContextLine = (line: string): boolean => {
  const normalized = normalize(line);
  return /\b(emails?|correos?)\b/i.test(normalized)
    && /\b(review[-\s]?only|no\s+(?:deben|debe)\s+asignarse|no\s+asignar|familia|acompanante|acompañante|ariana|sin\s+confirmacion|sin\s+confirmación)\b/i.test(normalized);
};

const peopleFromLine = (line: string): CrmFactPersonHint[] => {
  if (isReviewOnlyEmailContextLine(line)) return [];

  const email = extractFirst(emailRegex, line)?.toLowerCase() ?? null;
  const instagramHandle = extractFirst(handleRegex, line)?.replace(/^@/, '').toLowerCase() ?? null;
  const phone = extractPhone(line);
  const handleAlias = instagramHandle ? aliasAfterHandle(line) : null;

  if (instagramHandle && handleAlias) {
    return [{
      rawName: handleAlias,
      email,
      instagramHandle,
      phone,
      personIdHint: email ? `email:${email}` : `ig:${instagramHandle}`,
    }];
  }

  const names = peopleBeforeVerb(line);

  if (!names.length && (email || instagramHandle || phone)) {
    return [{
      rawName: handleAlias,
      email,
      instagramHandle,
      phone,
      personIdHint: email ? `email:${email}` : instagramHandle ? `ig:${instagramHandle}` : null,
    }];
  }

  return names.map((rawName) => ({
    rawName,
    email,
    instagramHandle,
    phone,
    personIdHint: email ? `email:${email}` : instagramHandle ? `ig:${instagramHandle}` : null,
  }));
};

const programFromLine = (line: string): string | null => {
  const normalized = normalize(line);
  if (normalized.includes('yoga')) return 'yoga';
  if (/\b(?:mis\s+)?clases\b/.test(normalized) && /\b(estudiante|alumn|asistente|entra|asiste)\b/.test(normalized)) return 'yoga';
  if (normalized.includes('encuentro feliz')) return 'mi_encuentro_feliz';
  if (normalized.includes('mentoria') || normalized.includes('mentoría')) return 'mentoria';
  if (
    normalized.includes('terapia')
    || normalized.includes('consulta terapeutica')
    || normalized.includes('psicologia')
    || normalized.includes('psicología')
    || normalized.includes('paciente')
  ) return 'terapia';
  if (normalized.includes('meditacion') || normalized.includes('meditación')) return 'curso_meditacion';
  if (normalized.includes('microintervencion') || normalized.includes('microintervención')) return 'microintervenciones';
  return null;
};

const programForFactType = (
  type: CrmFactType,
  line: string,
  fallback: string | null,
): string | null => {
  const normalized = normalize(line);
  if (
    type === 'client_status'
    && (
      normalized.includes('paciente')
      || normalized.includes('psicologia')
      || normalized.includes('psicología')
      || normalized.includes('consulta terapeutica')
      || normalized.includes('terapia')
    )
  ) {
    return 'terapia';
  }
  return fallback;
};

const eventNameFromLine = (line: string): string | null => {
  const retiro = line.match(/\b(?:retiro|retreat)\s+(?:de\s+|en\s+)?([^.,;]+)/i);
  if (retiro?.[1]) return `retiro ${retiro[1].trim()}`;
  if (/mi encuentro feliz/i.test(line)) return 'Mi Encuentro Feliz';
  const programa = line.match(/\bprograma\s+([^.,;]+)/i);
  if (programa?.[1]) return programa[1].trim();
  return null;
};

const inferFactTypes = (line: string): CrmFactType[] => {
  const normalized = normalize(line);
  const types: CrmFactType[] = [];

  if (/(email|correo|telefono|teléfono|celular|whatsapp|ciudad|pais|país|instagram|handle)/i.test(line)) {
    types.push('identity_update');
  }
  if (normalized.includes('retiro') && /(asist|vino|vinieron|particip)/i.test(normalized)) {
    types.push('retreat_attendance');
  }
  if (normalized.includes('encuentro feliz') && /(asist|vino|vinieron|particip)/i.test(normalized)) {
    types.push('community_event_attendance');
  }
  if (
    (
      normalized.includes('yoga')
      || /\b(?:mis\s+)?clases\b/.test(normalized)
    )
    && /(estudiante|alumn|asistente|clase|programa|grupo|entra|asiste|empezo|empezaron|particip)/i.test(normalized)
  ) {
    types.push('program_participation');
  }
  if (
    /(interesad|pidio info|pidió info|quiere info|pregunto|preguntó|considerando)/i.test(normalized)
    || (
      normalized.includes('retiro')
      && /(conversacion activa|conversación activa|seguimiento|primer mensaje|mensaje entrante|esperando respuesta|recibio la informacion|recibió la información|mantener la conversacion|mantener la conversación)/i.test(normalized)
    )
  ) {
    types.push('expressed_interest');
  }
  if (/(cliente|clienta|cliente activo|clienta activa|cliente recurrente|clienta recurrente|paciente)/i.test(normalized)) {
    types.push('client_status');
  }
  if (/(compro|compró|compraron|pago|pagó|pagaron|compra|pago)/i.test(normalized)) {
    types.push('purchase');
  }

  return Array.from(new Set(types.length ? types : ['note']));
};

const containsSensitivePrivateContext = (line: string): boolean => {
  const normalized = normalize(line);
  return /\b(paciente|psicolog|psicologia|psicologia|terapeutic|diagnostic|diagnostico|salud mental)\b/i.test(normalized);
};

const containsRelationshipContext = (line: string): boolean => {
  const normalized = normalize(line);
  return /\b(amig|aliad|consultor|consultora|familia|familiar)\b/i.test(normalized);
};

const confidenceFor = (
  sourceKind: CrmFactSourceKind,
  type: CrmFactType,
): CrmFactEvent['confidence'] => {
  if (sourceKind === 'alejandro_conversation') return 'high';
  if (sourceKind === 'mailerlite_tag_snapshot') return type === 'expressed_interest' ? 'medium' : 'high';
  if (sourceKind === 'telegram_human_report') return 'medium';
  if (sourceKind === 'instagram_signal') return 'medium';
  return 'low';
};

const reviewNeeded = (sourceKind: CrmFactSourceKind, type: CrmFactType, person: CrmFactPersonHint): boolean => {
  if (!person.personIdHint && !person.email && !person.instagramHandle) return true;
  if (type === 'purchase' || type === 'client_status') return true;
  if (sourceKind === 'unknown') return true;
  return false;
};

const tagsFor = (type: CrmFactType, program: string | null): string[] => {
  const tags = [`fact:${type}`];
  if (program) tags.push(`program:${program}`);
  return tags;
};

const scoringHintsFor = (
  type: CrmFactType,
  program: string | null,
): CrmFactEvent['suggestedCardPatch']['scoringHints'] => {
  if (type === 'retreat_attendance') return { participation: { retreatsAttended: 1 } };
  if (type === 'community_event_attendance') return { participation: { happyCircle90d: 1 } };
  if (type === 'program_participation' && program === 'yoga') return { participation: { yogaClasses90d: 1 } };
  if (type === 'purchase') {
    if (program === 'mentoria') return { purchases: { purchaseCount: 1, mentorshipSessions: 1, activeClient: true } };
    if (program === 'terapia') return { purchases: { purchaseCount: 1, therapySessions: 1, activeClient: true } };
    if (program === 'curso_meditacion' || program === 'microintervenciones') {
      return { purchases: { purchaseCount: 1, digitalProductsPurchased: 1 } };
    }
    if (program === 'retiro') return { purchases: { purchaseCount: 1, retreatsPurchased: 1 } };
    return { purchases: { purchaseCount: 1 } };
  }
  if (type === 'client_status' && program === 'terapia') return { purchases: { activeClient: true } };
  return {};
};

const roleFor = (type: CrmFactType): string | null => {
  switch (type) {
    case 'program_participation':
      return 'student';
    case 'retreat_attendance':
    case 'community_event_attendance':
      return 'attendee';
    case 'client_status':
      return 'client';
    case 'expressed_interest':
      return 'prospect';
    case 'purchase':
      return 'buyer';
    default:
      return null;
  }
};

const sourceLabel = (sourceKind: CrmFactSourceKind, reporter: string | null, channel: string | null): string =>
  [sourceKind, reporter, channel].filter(Boolean).join(':');

export const buildCrmFactIntakeDraft = (input: CrmFactIntakeInput): CrmFactIntakeDraft => {
  const text = cleanString(input.text);
  if (!text) throw new Error('fact_intake_text_required');

  const generatedAt = isoNow(input.observedAt);
  const occurredAt = input.occurredAt ? isoNow(input.occurredAt) : null;
  const sourceKind = input.sourceKind ?? 'unknown';
  const reporter = cleanString(input.reporter);
  const channel = cleanString(input.channel);
  const lines = splitLines(text);
  const facts: CrmFactEvent[] = [];
  const ambiguities: CrmFactIntakeDraft['ambiguities'] = [];

  for (const line of lines) {
    const people = peopleFromLine(line);
    const types = inferFactTypes(line);
    const program = programFromLine(line);
    const eventName = eventNameFromLine(line);

    if (!people.length) {
      ambiguities.push({
        code: 'missing_person_hint',
        line,
        detail: 'No stable person name, email, phone, or Instagram handle was detected.',
      });
    }
    if (types.length === 1 && types[0] === 'note') {
      ambiguities.push({
        code: 'generic_note_only',
        line,
        detail: 'The line did not match a specific CRM fact type yet.',
      });
    }
    if (containsSensitivePrivateContext(line)) {
      ambiguities.push({
        code: 'sensitive_private_context',
        line,
        detail: 'Therapy or psychology service context was detected; it can represent a client relationship, but should stay privacy-restricted and never drive outbound without review.',
      });
    }
    if (containsRelationshipContext(line)) {
      ambiguities.push({
        code: 'relationship_context_not_structured',
        line,
        detail: 'Friend, ally, consultant, family, or relationship context was detected but is not a structured card field yet.',
      });
    }

    for (const person of people) {
      for (const type of types) {
        const factProgram = programForFactType(type, line, program);
        const product = factProgram === 'yoga' ? 'yoga_classes'
          : factProgram === 'mentoria' ? 'mentorship'
            : factProgram === 'terapia' ? 'therapy'
              : factProgram === 'curso_meditacion' || factProgram === 'microintervenciones' ? 'digital_product'
                : type === 'retreat_attendance' || (line.toLowerCase().includes('retiro') && (type === 'expressed_interest' || type === 'purchase')) ? 'retreat'
                  : null;
        const factId = `fact_${hashId([
          type,
          person.personIdHint ?? person.rawName ?? '',
          line,
          generatedAt,
          sourceKind,
        ])}`;
        const requiresHumanReview = reviewNeeded(sourceKind, type, person);
        facts.push({
          factId,
          type,
          person,
          subject: {
            program: factProgram,
            product,
            eventName,
            role: roleFor(type),
            status: type === 'expressed_interest' ? 'interested' : type === 'client_status' ? 'active' : null,
          },
          observedAt: generatedAt,
          occurredAt,
          source: {
            kind: sourceKind,
            reporter,
            channel,
          },
          confidence: confidenceFor(sourceKind, type),
          requiresHumanReview,
          evidenceText: line,
          suggestedCardPatch: {
            evidence: {
              source: sourceLabel(sourceKind, reporter, channel),
              observedAt: generatedAt,
              note: line,
            },
            tags: tagsFor(type, factProgram),
            scoringHints: scoringHintsFor(type, factProgram),
          },
        });
      }
    }
  }

  const peopleCount = new Set(facts.map((fact) => fact.person.personIdHint ?? fact.person.rawName ?? fact.factId)).size;
  const factTypes = FACT_TYPES.reduce((acc, type) => {
    acc[type] = facts.filter((fact) => fact.type === type).length;
    return acc;
  }, {} as Record<CrmFactType, number>);

  return {
    schemaVersion: CRM_VNEXT_FACT_INTAKE_SCHEMA_VERSION,
    generatedAt,
    mode: 'dry_run_fact_intake',
    input: {
      text,
      sourceKind,
      reporter,
      channel,
    },
    facts,
    ambiguities,
    summary: {
      linesParsed: lines.length,
      facts: facts.length,
      people: peopleCount,
      requiresHumanReview: facts.filter((fact) => fact.requiresHumanReview).length,
      factTypes,
    },
    safety: {
      dryRun: true,
      outboundProhibited: true,
      recordMutationProhibited: true,
      allowedUse: [
        'Preview how a human or source signal would become CRM facts.',
        'Prepare a review queue for ambiguous identities.',
        'Design future write paths without mutating records.',
      ],
      prohibitedActions: [
        'Do not mutate person cards from this draft.',
        'Do not send outbound messages.',
        'Do not treat low-confidence facts as final truth.',
      ],
    },
  };
};
