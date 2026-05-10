import { createHash } from 'node:crypto';
import type { CrmConnectedEvidenceSourceInput } from './crm-vnext-deep-local-stitching';
import type { CrmFactIntakeInput, CrmFactPersonHint } from './crm-vnext-fact-intake';
import {
  buildCrmVNextIdentityStitchingResearch,
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
  type CrmIdentityStitchingResearchReport,
} from './crm-vnext-identity-stitching-research';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_LEAD_CAPTURE_EVIDENCE_HELPER_SCHEMA_VERSION =
  'crm-vnext-lead-capture-evidence-helper-2026-05-10' as const;

export type CrmLeadCaptureSourceSystem =
  | 'manychat'
  | 'crm_webhook'
  | 'vercel_proxy'
  | 'instagram_dm'
  | 'whatsapp_automation'
  | 'mailerlite_form'
  | 'local_export'
  | 'unknown';

export type CrmLeadCaptureEvidenceRecord = {
  id?: string | number | null;
  sourceId?: string | null;
  sourceSystem?: CrmLeadCaptureSourceSystem | string | null;
  eventName?: string | null;
  event?: string | null;
  flowId?: string | null;
  flow_id?: string | null;
  flowName?: string | null;
  flow_name?: string | null;
  automationName?: string | null;
  automation_name?: string | null;
  triggerType?: string | null;
  trigger_type?: string | null;
  contactId?: string | number | null;
  contact_id?: string | number | null;
  manychatContactId?: string | number | null;
  manychat_contact_id?: string | number | null;
  instagramUsername?: string | null;
  instagram_username?: string | null;
  instagramHandle?: string | null;
  instagram_handle?: string | null;
  igUserId?: string | number | null;
  ig_user_id?: string | number | null;
  fullName?: string | null;
  full_name?: string | null;
  name?: string | null;
  firstName?: string | null;
  first_name?: string | null;
  lastName?: string | null;
  last_name?: string | null;
  email?: string | null;
  emails?: string[] | string | null;
  extracted_email?: string | null;
  phone?: string | null;
  phones?: string[] | string | null;
  city?: string | null;
  country?: string | null;
  tags?: string[] | string | null;
  groups?: string[] | string | null;
  customFields?: unknown;
  custom_fields?: unknown;
  systemFields?: unknown;
  system_fields?: unknown;
  fields?: unknown;
  lastTextInput?: string | null;
  last_text_input?: string | null;
  last_input_text?: string | null;
  messageText?: string | null;
  message_text?: string | null;
  text?: string | null;
  message?: unknown;
  notes?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  observedAt?: string | null;
  observed_at?: string | null;
  payload?: unknown;
  body?: unknown;
  data?: unknown;
  meta?: unknown;
  contact?: unknown;
  subscriber?: unknown;
  Full_Contact_Data?: unknown;
  full_contact_data?: unknown;
  [key: string]: unknown;
};

export type CrmLeadCaptureEvidenceQueryPlan = {
  clueId: string;
  person: CrmFactPersonHint;
  searchTerms: string[];
  suggestedSources: Array<{
    sourceSystem: CrmLeadCaptureSourceSystem;
    lookup: string;
    reason: string;
  }>;
  reason: string;
};

export type CrmLeadCaptureEvidenceHelperReport = {
  schemaVersion: typeof CRM_VNEXT_LEAD_CAPTURE_EVIDENCE_HELPER_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_lead_capture_evidence_helper';
  research: CrmIdentityStitchingResearchReport;
  queryPlans: CrmLeadCaptureEvidenceQueryPlan[];
  evidenceSources: CrmConnectedEvidenceSourceInput[];
  reviewSignals: Array<{
    clueId: string;
    code: 'lead_capture_source_hunt_required' | 'handle_matched_capture_identity';
    message: string;
    instagramHandle: string | null;
  }>;
  summary: {
    clues: number;
    queryPlans: number;
    leadCaptureRecordsRead: number;
    leadCaptureRecordsMatched: number;
    evidenceSources: number;
    authBlocked: boolean;
  };
  auth: {
    liveManyChatCalledByHelper: false;
    liveInstagramCalledByHelper: false;
    liveMailerLiteCalledByHelper: false;
    liveWhatsAppCalledByHelper: false;
    externalSearchStatus: 'not_requested' | 'results_supplied' | 'blocked';
    blocker: string | null;
    suggestedUnblockAction: string | null;
  };
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    manyChatLiveMutationProhibited: true;
    instagramPermissionMutationProhibited: true;
    mailerLiteMutationProhibited: true;
    whatsappMutationProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmLeadCaptureEvidenceHelperInput = CrmFactIntakeInput & {
  cards?: PersonCardVNext[] | null;
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  research?: CrmIdentityStitchingResearchReport | null;
  leadCaptureSearchResults?: unknown;
  authBlocker?: string | null;
  now?: string | Date | null;
  maxEvidenceSources?: number | null;
};

const MAX_EVIDENCE_SOURCES = 50;

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanString = (value: unknown): string | null => {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeHandle = (value: string | null | undefined): string | null => {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const instagramUrl = cleaned.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i)?.[1];
  const handle = (instagramUrl ?? cleaned).replace(/^@+/, '').replace(/[/?#].*$/, '').trim().toLowerCase();
  return /^[a-z0-9._]{2,30}$/.test(handle) ? handle : null;
};

const hashId = (parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

const firstRecord = (value: unknown): Record<string, unknown> | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const record = asRecord(item);
      if (record) return record;
    }
    return null;
  }
  return asRecord(value);
};

const nestedRecords = (record: CrmLeadCaptureEvidenceRecord): Record<string, unknown>[] =>
  [
    record,
    asRecord(record.payload),
    asRecord(record.body),
    asRecord(record.data),
    asRecord(record.meta),
    asRecord(record.contact),
    asRecord(record.subscriber),
    asRecord(record.message),
    firstRecord(record.Full_Contact_Data),
    firstRecord(record.full_contact_data),
  ].filter((item): item is Record<string, unknown> => Boolean(item));

const flowRecords = (record: CrmLeadCaptureEvidenceRecord): Record<string, unknown>[] =>
  [
    asRecord(record.flow),
    asRecord(asRecord(record.payload)?.flow),
    asRecord(asRecord(record.body)?.flow),
    asRecord(asRecord(record.data)?.flow),
  ].filter((item): item is Record<string, unknown> => Boolean(item));

const valueFromKeys = (record: CrmLeadCaptureEvidenceRecord, keys: string[]): string | null => {
  for (const source of nestedRecords(record)) {
    for (const key of keys) {
      const value = cleanString(source[key]);
      if (value) return value;
    }
  }
  return null;
};

const arrayFromKeys = (record: CrmLeadCaptureEvidenceRecord, keys: string[]): string[] => {
  const values: string[] = [];
  for (const source of nestedRecords(record)) {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          const cleaned = cleanString(item);
          if (cleaned) values.push(cleaned);
        }
      } else {
        const cleaned = cleanString(value);
        if (!cleaned) continue;
        if (cleaned.startsWith('[')) {
          try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
              values.push(...parsed.map(cleanString).filter((item): item is string => Boolean(item)));
              continue;
            }
          } catch {
            // Fall through to delimiter parsing.
          }
        }
        values.push(...cleaned.split(/[;,]/).map((item) => item.trim()).filter(Boolean));
      }
    }
  }
  return unique(values);
};

const normalizeLabel = (value: string): string =>
  normalize(value).replace(/[^a-z0-9]+/g, ' ').trim();

const customFieldContainers = (record: CrmLeadCaptureEvidenceRecord): unknown[] =>
  nestedRecords(record).flatMap((source) => [
    source.customFields,
    source.custom_fields,
    source.systemFields,
    source.system_fields,
    source.fields,
  ]);

const findCustomField = (record: CrmLeadCaptureEvidenceRecord, candidates: string[]): string | null => {
  const normalizedCandidates = candidates.map(normalizeLabel);

  for (const fields of customFieldContainers(record)) {
    if (!fields) continue;
    if (Array.isArray(fields)) {
      for (const field of fields) {
        const fieldRecord = asRecord(field);
        if (!fieldRecord) continue;
        const label = normalizeLabel(cleanString(fieldRecord.name) ?? cleanString(fieldRecord.title) ?? cleanString(fieldRecord.caption) ?? '');
        if (!label || !normalizedCandidates.includes(label)) continue;
        const value = cleanString(fieldRecord.value);
        if (value) return value;
      }
      continue;
    }

    const recordFields = asRecord(fields);
    if (!recordFields) continue;
    for (const [key, value] of Object.entries(recordFields)) {
      const label = normalizeLabel(key);
      if (!label || !normalizedCandidates.includes(label)) continue;
      const cleaned = cleanString(value);
      if (cleaned) return cleaned;
    }
  }

  return null;
};

const extractEmail = (value: string | null | undefined): string | null =>
  value?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0].toLowerCase() ?? null;

const normalizedDigits = (value: string | null | undefined): string => (value ?? '').replace(/\D/g, '');

const extractPhone = (value: string | null | undefined): string | null => {
  const match = value?.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? null;
  if (!match) return null;
  const phone = match.replace(/[^\d+]/g, '');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (/^(?:19|20)\d{6,}$/.test(digits)) return null;
  return phone;
};

const recordMessage = (record: CrmLeadCaptureEvidenceRecord): string | null =>
  valueFromKeys(record, [
    'lastTextInput',
    'last_text_input',
    'last_input_text',
    'messageText',
    'message_text',
    'last_dm_text',
    'text',
    'rawText',
    'notes',
  ])
  ?? cleanString(asRecord(valueFromKeys(record, ['message']))?.text)
  ?? findCustomField(record, [
    'last_text_input',
    'last input text',
    'last_input_text',
    'last_dm_text',
    'mensaje',
    'message',
    'raw_message',
  ]);

const recordCaptureText = (record: CrmLeadCaptureEvidenceRecord): string | null =>
  valueFromKeys(record, [
    'lastTextInput',
    'last_text_input',
    'last_input_text',
    'messageText',
    'message_text',
    'last_dm_text',
    'text',
    'rawText',
  ])
  ?? cleanString(asRecord(valueFromKeys(record, ['message']))?.text)
  ?? findCustomField(record, [
    'last_text_input',
    'last input text',
    'last_input_text',
    'last_dm_text',
    'mensaje',
    'message',
    'raw_message',
  ]);

const recordName = (record: CrmLeadCaptureEvidenceRecord): string | null => {
  const direct = valueFromKeys(record, ['fullName', 'full_name', 'name', 'ig_display_name']);
  if (direct) return direct;
  const first = valueFromKeys(record, ['firstName', 'first_name']);
  const last = valueFromKeys(record, ['lastName', 'last_name']);
  const assembled = [first, last].filter(Boolean).join(' ').trim();
  return assembled || findCustomField(record, ['name', 'full name', 'nombre', 'nombre completo']);
};

const recordEmails = (record: CrmLeadCaptureEvidenceRecord): string[] => {
  const values = [
    valueFromKeys(record, ['email', 'subscriber_email', 'contact_email', 'extracted_email', 'resolvedEmail']),
    findCustomField(record, ['email', 'correo', 'correo electronico', 'correo electrónico', 'email_raw_from_first_dm', 'email_from_first_dm', 'email_dm', 'correo_dm']),
    recordCaptureText(record),
    ...arrayFromKeys(record, ['emails']),
  ];
  return unique(values.map(extractEmail).filter((item): item is string => Boolean(item)));
};

const recordPhones = (record: CrmLeadCaptureEvidenceRecord): string[] => {
  const values = [
    valueFromKeys(record, ['phone', 'subscriber_phone', 'contact_phone', 'whatsapp', 'phone_number']),
    findCustomField(record, ['phone', 'telefono', 'teléfono', 'celular', 'whatsapp', 'phone_raw_from_first_dm', 'telefono_dm']),
    recordCaptureText(record),
    ...arrayFromKeys(record, ['phones']),
  ];
  return unique(values.map(extractPhone).filter((item): item is string => Boolean(item)));
};

const recordHandle = (record: CrmLeadCaptureEvidenceRecord): string | null =>
  normalizeHandle(valueFromKeys(record, [
    'instagramUsername',
    'instagram_username',
    'instagramHandle',
    'instagram_handle',
    'ig_username',
    'handle',
  ]))
  ?? normalizeHandle(findCustomField(record, ['instagram', 'instagram_handle', 'instagram username', 'instagram_username', 'ig_username']))
  ?? normalizeHandle(arrayFromKeys(record, ['socials', 'social_profiles']).find((item) => /instagram|@/.test(item.toLowerCase())) ?? null);

const recordContactId = (record: CrmLeadCaptureEvidenceRecord): string | null =>
  valueFromKeys(record, ['manychatContactId', 'manychat_contact_id', 'contactId', 'contact_id', 'subscriber_id', 'id']);

const recordFlowName = (record: CrmLeadCaptureEvidenceRecord): string | null =>
  valueFromKeys(record, ['flowName', 'flow_name', 'automationName', 'automation_name'])
  ?? flowRecords(record).map((flow) => cleanString(flow.name)).find(Boolean)
  ?? null;

const recordFlowId = (record: CrmLeadCaptureEvidenceRecord): string | null =>
  valueFromKeys(record, ['flowId', 'flow_id', 'automation_id'])
  ?? flowRecords(record).map((flow) => cleanString(flow.id)).find(Boolean)
  ?? null;

const recordSourceSystem = (record: CrmLeadCaptureEvidenceRecord): CrmLeadCaptureSourceSystem => {
  const raw = normalize(valueFromKeys(record, ['sourceSystem', 'source_system', 'provider', 'source', 'channel']));
  if (raw.includes('manychat')) return 'manychat';
  if (raw.includes('webhook') || raw.includes('supabase') || raw.includes('crm')) return 'crm_webhook';
  if (raw.includes('vercel') || raw.includes('proxy')) return 'vercel_proxy';
  if (raw.includes('instagram')) return 'instagram_dm';
  if (raw.includes('whatsapp')) return 'whatsapp_automation';
  if (raw.includes('mailerlite')) return 'mailerlite_form';

  const text = normalize(searchableText(record));
  if (text.includes('manychat')) return 'manychat';
  if (text.includes('vercel')) return 'vercel_proxy';
  if (text.includes('instagram')) return 'instagram_dm';
  if (text.includes('whatsapp')) return 'whatsapp_automation';
  if (text.includes('mailerlite')) return 'mailerlite_form';
  return 'unknown';
};

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/(api[_-]?key|token|secret|authorization)["':=\s]+[A-Za-z0-9._~+/=-]{12,}/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .trim();

const safeJsonText = (record: CrmLeadCaptureEvidenceRecord): string => {
  try {
    return cleanPublicText(JSON.stringify(record));
  } catch {
    return '';
  }
};

const searchableText = (record: CrmLeadCaptureEvidenceRecord): string =>
  cleanPublicText([
    recordName(record),
    recordHandle(record),
    ...recordEmails(record),
    ...recordPhones(record),
    valueFromKeys(record, ['city']),
    valueFromKeys(record, ['country']),
    recordFlowName(record),
    recordFlowId(record),
    recordContactId(record),
    recordMessage(record),
    ...arrayFromKeys(record, ['tags', 'groups']),
    safeJsonText(record),
  ].filter(Boolean).join(' '));

const personLabel = (person: CrmFactPersonHint): string | null =>
  cleanString(person.rawName)
  ?? cleanString(person.email)
  ?? cleanString(person.instagramHandle ? `@${person.instagramHandle}` : null)
  ?? cleanString(person.phone);

const personSearchTerms = (person: CrmFactPersonHint): string[] => {
  const terms: string[] = [];
  const add = (value: string | null | undefined) => {
    const cleaned = cleanString(value?.replace(/^@+/, '') ?? null);
    if (cleaned && cleaned.includes(':')) return;
    if (cleaned && normalize(cleaned).length >= 3) terms.push(cleaned);
  };

  add(person.email);
  add(person.instagramHandle);
  add(person.phone?.replace(/\D/g, ''));
  add(person.rawName);
  for (const token of normalize(person.rawName).split(/\s+/).filter((item) => item.length >= 5)) add(token);
  return unique(terms);
};

const suggestedSourcesFor = (person: CrmFactPersonHint): CrmLeadCaptureEvidenceQueryPlan['suggestedSources'] => {
  const label = personLabel(person) ?? 'this contact';
  const handle = normalizeHandle(person.instagramHandle);
  const searchTerms = personSearchTerms(person).join(', ');
  return [
    {
      sourceSystem: 'manychat',
      lookup: handle
        ? `/fb/subscriber/findBySystemField for Instagram username=${handle}, then /fb/subscriber/getInfo read-only`
        : `/fb/subscriber/findByName or findByCustomField using: ${searchTerms}`,
      reason: `ManyChat may hold the original opt-in, Instagram username, email, phone, custom fields, tags, and last interaction for ${label}.`,
    },
    {
      sourceSystem: 'crm_webhook',
      lookup: `Search webhook_events/contacts/interactions by handle, contact_id, extracted_email, phone, and message text: ${searchTerms}`,
      reason: 'The legacy webhook persisted inbound ManyChat/Instagram payloads before syncing to MailerLite.',
    },
    {
      sourceSystem: 'vercel_proxy',
      lookup: `Search Vercel/proxy logs or exports for lead registration payloads matching: ${searchTerms}`,
      reason: 'The proxy may contain the bridge event that inserted the lead into MailerLite/CRM.',
    },
    {
      sourceSystem: 'whatsapp_automation',
      lookup: `Search class-recording/WhatsApp automation logs for phone or name matching: ${searchTerms}`,
      reason: 'Class recording delivery can prove the phone used for ongoing yoga participation.',
    },
    {
      sourceSystem: 'mailerlite_form',
      lookup: `Use MailerLite cursor pagination + local filtering for handle/name/email/phone terms: ${searchTerms}`,
      reason: 'MailerLite may hold the subscriber row created after the Instagram opt-in.',
    },
  ];
};

const buildQueryPlan = (clue: CrmIdentityStitchingClue): CrmLeadCaptureEvidenceQueryPlan => {
  const searchTerms = personSearchTerms(clue.person);
  const label = personLabel(clue.person) ?? clue.clueId;
  return {
    clueId: clue.clueId,
    person: clue.person,
    searchTerms,
    suggestedSources: suggestedSourcesFor(clue.person),
    reason: searchTerms.length
      ? `Search read-only lead-capture traces for original opt-in/contact fields related to ${label}.`
      : 'Not enough identity terms to search lead-capture traces safely.',
  };
};

const normalizeResults = (value: unknown): CrmLeadCaptureEvidenceRecord[] => {
  if (Array.isArray(value)) return value.filter((item): item is CrmLeadCaptureEvidenceRecord => Boolean(item && typeof item === 'object'));
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of [
    'leadCaptureSearchResults',
    'leadCaptureRecords',
    'leadCaptureResults',
    'manychatResults',
    'manyChatResults',
    'webhookEvents',
    'webhook_events',
    'events',
    'logs',
    'rows',
    'data',
    'items',
    'results',
  ]) {
    const maybeResults = record[key];
    if (Array.isArray(maybeResults)) return normalizeResults(maybeResults);
  }
  return [];
};

const nameTokens = (value: string | null | undefined): string[] =>
  normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .filter((item) => !['del', 'las', 'los', 'una', 'uno', 'con', 'para', 'hija', 'hijo'].includes(item));

const identityMatchScore = (
  record: CrmLeadCaptureEvidenceRecord,
  plan: CrmLeadCaptureEvidenceQueryPlan,
): number => {
  const text = normalize(searchableText(record));
  if (!text) return 0;

  const person = plan.person;
  const email = cleanString(person.email)?.toLowerCase();
  if (email && recordEmails(record).some((item) => item.toLowerCase() === email)) return 1000;

  const phone = normalizedDigits(person.phone);
  if (phone.length >= 7 && recordPhones(record).some((item) => {
    const digits = normalizedDigits(item);
    return digits.includes(phone) || phone.includes(digits);
  })) {
    return 920;
  }

  const personHandle = normalizeHandle(person.instagramHandle);
  const resultHandle = recordHandle(record);
  if (personHandle && resultHandle === personHandle) return 900;
  if (personHandle && resultHandle && resultHandle !== personHandle) return 0;

  const rawName = cleanString(person.rawName);
  const tokens = nameTokens(rawName);
  if (!tokens.length) return 0;

  const presentTokens = tokens.filter((token) => text.includes(token));
  const exactResultName = normalize(recordName(record) ?? '');
  const exactName = Boolean(rawName && exactResultName && exactResultName.includes(normalize(rawName)));
  const hasContactDetail = recordEmails(record).length > 0 || recordPhones(record).length > 0 || Boolean(recordHandle(record));

  if (exactName && tokens.length >= 2) return 520 + presentTokens.length * 30;
  if (tokens.length >= 2 && presentTokens.length >= Math.min(2, tokens.length)) return 260 + presentTokens.length * 25;
  if (tokens.length === 1 && presentTokens.length === 1 && hasContactDetail) return personHandle ? 140 : 90;
  return 0;
};

const recordSourceId = (record: CrmLeadCaptureEvidenceRecord): string => {
  const supplied = cleanString(record.sourceId);
  if (supplied) return supplied.startsWith('lead-capture:') ? supplied : `lead-capture:${supplied}`;
  const system = recordSourceSystem(record);
  const id = cleanString(record.id) ?? recordContactId(record);
  if (id) return `lead-capture:${system}:${id}`;
  return `lead-capture:${system}:${hashId([recordName(record), recordHandle(record), recordFlowName(record), searchableText(record)])}`;
};

const sourceTitle = (record: CrmLeadCaptureEvidenceRecord): string =>
  [
    recordSourceSystem(record),
    recordFlowName(record),
    recordName(record),
    recordHandle(record) ? `@${recordHandle(record)}` : null,
  ].filter(Boolean).join(' / ');

const evidenceSourceForRecord = (
  record: CrmLeadCaptureEvidenceRecord,
  plan: CrmLeadCaptureEvidenceQueryPlan,
): CrmConnectedEvidenceSourceInput => {
  const emails = recordEmails(record);
  const phones = recordPhones(record);
  const handle = recordHandle(record);
  const message = recordMessage(record);
  const tags = unique([...arrayFromKeys(record, ['tags']), ...arrayFromKeys(record, ['groups'])]);
  return {
    sourceKind: 'lead_capture_export',
    sourceId: recordSourceId(record),
    title: sourceTitle(record),
    email: emails[0] ?? null,
    handle,
    observedAt: valueFromKeys(record, ['observedAt', 'observed_at', 'createdAt', 'created_at', 'updatedAt', 'updated_at']),
    snippet: cleanPublicText([
      `Source: ${recordSourceSystem(record)}`,
      recordFlowName(record) ? `Flow: ${recordFlowName(record)}` : null,
      recordFlowId(record) ? `Flow ID: ${recordFlowId(record)}` : null,
      recordContactId(record) ? `Contact ID: ${recordContactId(record)}` : null,
      recordName(record) ? `Name: ${recordName(record)}` : null,
      handle ? `Instagram: @${handle}` : null,
      emails.length ? `Email: ${emails.join(', ')}` : null,
      phones.length ? `Phone: ${phones.join(', ')}` : null,
      valueFromKeys(record, ['city']) ? `City: ${valueFromKeys(record, ['city'])}` : null,
      valueFromKeys(record, ['country']) ? `Country: ${valueFromKeys(record, ['country'])}` : null,
      tags.length ? `Tags/groups: ${tags.join(', ')}` : null,
    ].filter(Boolean).join('\n')),
    text: cleanPublicText([
      `Matched clue: ${personLabel(plan.person) ?? plan.clueId}`,
      message ? `Message: ${message}` : null,
      cleanString(record.notes) ? `Notes: ${record.notes}` : null,
    ].filter(Boolean).join('\n')),
  };
};

const evidenceSourcesForResults = (
  records: CrmLeadCaptureEvidenceRecord[],
  queryPlans: CrmLeadCaptureEvidenceQueryPlan[],
  maxEvidenceSources: number,
): { evidenceSources: CrmConnectedEvidenceSourceInput[]; matchedRecords: number; matchedClueIds: Set<string> } => {
  const evidenceSources: CrmConnectedEvidenceSourceInput[] = [];
  const seen = new Set<string>();
  const matchedClueIds = new Set<string>();
  let matchedRecords = 0;

  for (const record of records) {
    const rankedPlans = queryPlans
      .map((plan) => ({ plan, score: identityMatchScore(record, plan) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const matchingPlan = rankedPlans[0]?.score > (rankedPlans[1]?.score ?? 0) ? rankedPlans[0].plan : null;
    if (!matchingPlan) continue;
    matchedRecords += 1;
    matchedClueIds.add(matchingPlan.clueId);
    const evidence = evidenceSourceForRecord(record, matchingPlan);
    const key = evidence.sourceId ?? JSON.stringify(evidence);
    if (seen.has(key)) continue;
    seen.add(key);
    evidenceSources.push(evidence);
    if (evidenceSources.length >= maxEvidenceSources) break;
  }

  return { evidenceSources, matchedRecords, matchedClueIds };
};

const reviewSignalsFor = (
  queryPlans: CrmLeadCaptureEvidenceQueryPlan[],
  evidenceSources: CrmConnectedEvidenceSourceInput[],
  matchedClueIds: Set<string>,
): CrmLeadCaptureEvidenceHelperReport['reviewSignals'] => {
  const signals: CrmLeadCaptureEvidenceHelperReport['reviewSignals'] = [];
  for (const plan of queryPlans) {
    const handle = normalizeHandle(plan.person.instagramHandle);
    if (!handle) continue;
    if (matchedClueIds.has(plan.clueId)) {
      const handleEvidence = evidenceSources.some((source) => normalizeHandle(source.handle) === handle);
      if (handleEvidence) {
        signals.push({
          clueId: plan.clueId,
          code: 'handle_matched_capture_identity',
          instagramHandle: handle,
          message: `Lead-capture evidence links @${handle} to captured contact fields; keep it review-only until a later card-write approval.`,
        });
      }
      continue;
    }
    signals.push({
      clueId: plan.clueId,
      code: 'lead_capture_source_hunt_required',
      instagramHandle: handle,
      message: `No supplied lead-capture record matched @${handle}; ask Mantis to search ManyChat, webhook events, Vercel proxy logs, MailerLite cursor export, and WhatsApp automation logs read-only.`,
    });
  }
  return signals;
};

const safety = (): CrmLeadCaptureEvidenceHelperReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  manyChatLiveMutationProhibited: true,
  instagramPermissionMutationProhibited: true,
  mailerLiteMutationProhibited: true,
  whatsappMutationProhibited: true,
  allowedUse: [
    'Plan read-only searches across ManyChat, CRM webhook events, Vercel proxy traces, MailerLite exports, and WhatsApp automation logs.',
    'Convert supplied lead-capture records into lead_capture_export evidenceSources packets.',
    'Feed Deep Local Stitching without giving CRM live ManyChat, Instagram, MailerLite, or WhatsApp credentials.',
  ],
  prohibitedActions: [
    'Do not edit, pause, resume, or test ManyChat LIVE flows.',
    'Do not call live Instagram or request Instagram permissions.',
    'Do not mutate MailerLite subscribers, groups, tags, or automations.',
    'Do not send WhatsApp, Instagram, email, Telegram, or ManyChat messages.',
    'Do not mutate CRM person cards or Fact Store.',
    'Do not read, print, rotate, or refresh credentials.',
  ],
});

export const buildCrmVNextLeadCaptureEvidenceHelper = (
  input: CrmLeadCaptureEvidenceHelperInput,
): CrmLeadCaptureEvidenceHelperReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const research = input.research ?? buildCrmVNextIdentityStitchingResearch({
    text: input.text,
    sourceKind: input.sourceKind,
    reporter: input.reporter,
    channel: input.channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
    cards: input.cards ?? [],
    mailerBridgeRows: input.mailerBridgeRows,
  });
  const queryPlans = research.clues.map(buildQueryPlan);
  const records = normalizeResults(input.leadCaptureSearchResults);
  const maxEvidenceSources = Math.max(1, Math.min(100, Math.floor(input.maxEvidenceSources ?? MAX_EVIDENCE_SOURCES)));
  const evidence = evidenceSourcesForResults(records, queryPlans, maxEvidenceSources);
  const authBlocker = cleanString(input.authBlocker);

  return {
    schemaVersion: CRM_VNEXT_LEAD_CAPTURE_EVIDENCE_HELPER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_lead_capture_evidence_helper',
    research,
    queryPlans,
    evidenceSources: evidence.evidenceSources,
    reviewSignals: reviewSignalsFor(queryPlans, evidence.evidenceSources, evidence.matchedClueIds),
    summary: {
      clues: research.clues.length,
      queryPlans: queryPlans.filter((plan) => plan.searchTerms.length).length,
      leadCaptureRecordsRead: records.length,
      leadCaptureRecordsMatched: evidence.matchedRecords,
      evidenceSources: evidence.evidenceSources.length,
      authBlocked: Boolean(authBlocker),
    },
    auth: {
      liveManyChatCalledByHelper: false,
      liveInstagramCalledByHelper: false,
      liveMailerLiteCalledByHelper: false,
      liveWhatsAppCalledByHelper: false,
      externalSearchStatus: authBlocker ? 'blocked' : records.length ? 'results_supplied' : 'not_requested',
      blocker: authBlocker,
      suggestedUnblockAction: authBlocker
        ? 'Ask Alejandro to authorize the specific read-only connector/export route; do not refresh credentials or change live flows inside CRM.'
        : null,
    },
    safety: safety(),
  };
};
