import { getDmText } from '../utils/payload.js';

export type IngestionStatus = 'LIVE' | 'STOPPED' | 'DRAFT' | 'UNKNOWN';

export type CanonicalIngestionEventV1 = {
  version: 'v1';
  source_platform: string;
  flow_id: string;
  flow_name: string;
  trigger_type: string;
  contact_id: string;
  channel: string;
  message_text: string;
  event_ts: string;
  dedupe_key: string;
  message_id?: string;
  event_name?: string;
  status_normalized?: IngestionStatus;
  raw_flow_status?: string;
};

export type ContractBuildResult = {
  contract: CanonicalIngestionEventV1;
  requiredMissing: string[];
};

type AnyRecord = Record<string, unknown>;

const toStringSafe = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return undefined;
};

const firstString = (values: unknown[]): string | undefined => {
  for (const value of values) {
    const safe = toStringSafe(value);
    if (safe) return safe;
  }
  return undefined;
};

const normalizeStatus = (value: string | undefined): IngestionStatus => {
  if (!value) return 'UNKNOWN';
  const key = value.trim().toLowerCase();
  if (!key) return 'UNKNOWN';
  if (['live', 'enabled', 'active', 'running'].includes(key)) return 'LIVE';
  if (['stopped', 'disabled', 'paused', 'off'].includes(key)) return 'STOPPED';
  if (['draft'].includes(key)) return 'DRAFT';
  return 'UNKNOWN';
};

const resolveEventTimestamp = (payload: AnyRecord): string => {
  const raw = firstString([
    payload.event_ts,
    payload.timestamp,
    payload.created_at,
    payload.createdAt,
    payload.received_at,
    payload.receivedAt,
  ]);

  if (!raw) return new Date().toISOString();

  if (/^\d+$/.test(raw)) {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      const millis = asNumber > 10_000_000_000 ? asNumber : asNumber * 1000;
      return new Date(millis).toISOString();
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
};

const readFlowData = (payload: AnyRecord) => {
  const flowRecord = (payload.flow && typeof payload.flow === 'object' ? payload.flow : null) as AnyRecord | null;

  const flowId = firstString([
    payload.flow_id,
    payload.flowId,
    payload.automation_id,
    payload.rule_id,
    flowRecord?.id,
    flowRecord?.flow_id,
    flowRecord?.flowId,
  ]) ?? 'unknown-flow';

  const flowName = firstString([
    payload.flow_name,
    payload.flowName,
    payload.automation_name,
    payload.rule_name,
    flowRecord?.name,
    flowRecord?.title,
    flowRecord?.flow_name,
  ]) ?? 'unknown-flow';

  const flowStatusRaw = firstString([
    payload.flow_status,
    payload.status,
    flowRecord?.status,
  ]);

  return {
    flowId,
    flowName,
    flowStatusRaw,
    flowStatusNormalized: normalizeStatus(flowStatusRaw),
  };
};

const resolveContactId = (payload: AnyRecord): string => {
  const contact = (payload.contact && typeof payload.contact === 'object' ? payload.contact : null) as AnyRecord | null;
  const subscriber =
    (payload.subscriber && typeof payload.subscriber === 'object'
      ? payload.subscriber
      : null) as AnyRecord | null;
  const fullContactRaw = payload.Full_Contact_Data ?? payload.full_contact_data ?? payload.fullContactData;
  const fullContact =
    (Array.isArray(fullContactRaw)
      ? fullContactRaw.find((entry) => entry && typeof entry === 'object')
      : fullContactRaw) ?? null;
  const fullContactRecord =
    (fullContact && typeof fullContact === 'object' ? fullContact : null) as AnyRecord | null;

  const contactId = firstString([
    payload.contact_id,
    payload.contactId,
    contact?.id,
    subscriber?.id,
    fullContactRecord?.id,
    fullContactRecord?.key,
  ]);

  if (!contactId) return 'unknown-contact';
  return contactId.replace(/^user:/i, '');
};

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash;
};

export const buildIngestionDedupeKey = (input: {
  sourcePlatform: string;
  contactId: string;
  messageText: string;
}): string => {
  const base = `${input.sourcePlatform}|${input.contactId}|${normalizeText(input.messageText)}`.slice(0, 512);
  return `dpk:${hashString(base)}`;
};

export const buildCanonicalIngestionEventV1 = (payloadInput: unknown): ContractBuildResult => {
  const payload = (payloadInput && typeof payloadInput === 'object' ? payloadInput : {}) as AnyRecord;

  const sourcePlatform =
    firstString([payload.source_platform, payload.source, payload.platform, payload.channel]) ?? 'instagram';
  const channel = firstString([payload.channel, payload.source_channel, payload.source]) ?? 'instagram';
  const triggerType =
    firstString([payload.trigger_type, payload.trigger, payload.event, payload.event_type]) ?? 'unknown_trigger';
  const contactId = resolveContactId(payload);
  const messageText = getDmText(payload) || '';
  const eventTs = resolveEventTimestamp(payload);

  const flowData = readFlowData(payload);

  const dedupeKey = buildIngestionDedupeKey({
    sourcePlatform,
    contactId,
    messageText,
  });

  const contract: CanonicalIngestionEventV1 = {
    version: 'v1',
    source_platform: sourcePlatform,
    flow_id: flowData.flowId,
    flow_name: flowData.flowName,
    trigger_type: triggerType,
    contact_id: contactId,
    channel,
    message_text: messageText,
    event_ts: eventTs,
    dedupe_key: dedupeKey,
    message_id: firstString([payload.message_id, payload.last_received_message_id]),
    event_name: firstString([payload.event, payload.event_name]),
    status_normalized: flowData.flowStatusNormalized,
    raw_flow_status: flowData.flowStatusRaw,
  };

  const requiredMissing = [
    ['source_platform', contract.source_platform],
    ['flow_id', contract.flow_id],
    ['flow_name', contract.flow_name],
    ['trigger_type', contract.trigger_type],
    ['contact_id', contract.contact_id],
    ['channel', contract.channel],
    ['message_text', contract.message_text],
    ['event_ts', contract.event_ts],
    ['dedupe_key', contract.dedupe_key],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key as string);

  return {
    contract,
    requiredMissing,
  };
};

export const buildContractNormalizedPayload = (
  originalPayload: unknown,
  contract: CanonicalIngestionEventV1,
): AnyRecord => {
  const original = (originalPayload && typeof originalPayload === 'object' ? originalPayload : {}) as AnyRecord;
  const originalContact =
    (original.contact && typeof original.contact === 'object' ? original.contact : {}) as AnyRecord;
  const originalMessage =
    (original.message && typeof original.message === 'object' ? original.message : {}) as AnyRecord;

  return {
    ...original,
    source: contract.source_platform,
    channel: contract.channel,
    timestamp: contract.event_ts,
    event: contract.event_name ?? contract.trigger_type,
    trigger_type: contract.trigger_type,
    flow_id: contract.flow_id,
    flow_name: contract.flow_name,
    contact_id: contract.contact_id,
    message: {
      ...originalMessage,
      text: contract.message_text,
    },
    contact: {
      ...originalContact,
      id: contract.contact_id,
    },
  };
};
