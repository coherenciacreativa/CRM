import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbInsert, sbReady, sbSelect } from '../../../lib/utils/sb';

const SECRET = process.env.MAILERLITE_WEBHOOK_SECRET || process.env.MAILERLITE_WEBHOOK_TOKEN || '';

export const config = {
  api: {
    bodyParser: false,
  },
};

export type MailerLiteWebhookPayload = {
  event?: string;
  type?: string;
  timestamp?: string;
  date?: string;
  occurred_at?: string;
  data?: Record<string, any>;
  subscriber?: Record<string, any>;
  campaign?: Record<string, any>;
  automation?: Record<string, any>;
  account_id?: string | number;
  id?: string | number;
  name?: string;
};

export type MailerLiteWebhookEnvelope = MailerLiteWebhookPayload & {
  events?: MailerLiteWebhookPayload[];
};

type InteractionRecord = {
  contact_id?: string | null;
  platform: 'mailerlite';
  direction: 'inbound' | 'outbound';
  type: string;
  external_id: string;
  content?: string | null;
  meta: Record<string, unknown>;
  occurred_at?: string;
};

console.log('[mailerlite-webhook] module loaded');

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
  }
  return Buffer.concat(chunks);
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizeHeaderValues(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean);
  }
  return typeof value === 'string' && value ? [value] : [];
}

function bufferFromSignature(candidate: string): Buffer | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.startsWith('sha256=') ? trimmed.slice(7) : trimmed;
  for (const encoding of ['hex', 'base64'] as const) {
    try {
      const buf = Buffer.from(cleaned, encoding);
      if (buf.length) {
        return buf;
      }
    } catch (error) {
      // Ignore decoding failures; we'll try the next encoding or fall back below.
    }
  }
  return null;
}

export function verifySignature(
  raw: Buffer,
  legacySignatureHeader: string | string[] | undefined,
  tokenHeader: string | string[] | undefined,
  signatureHeader: string | string[] | undefined,
  secretOverride?: string,
): boolean {
  const secret = secretOverride ?? SECRET;
  if (!secret) return true;

  const legacySignatureValues = normalizeHeaderValues(legacySignatureHeader);
  const tokenValues = normalizeHeaderValues(tokenHeader);
  const signatureValues = normalizeHeaderValues(signatureHeader);

  const candidates = [...legacySignatureValues, ...tokenValues, ...signatureValues];

  if (!candidates.length) {
    console.warn('[mailerlite-webhook] signature verification failed', {
      reason: 'no_candidates',
      candidateCount: 0,
      legacySignatureHeaderPresent: legacySignatureValues.length > 0,
      legacySignatureValuesCount: legacySignatureValues.length,
      legacySignatureValueLengths: legacySignatureValues.map((value) => value.length),
      tokenHeaderPresent: tokenValues.length > 0,
      tokenValuesCount: tokenValues.length,
      tokenValueLengths: tokenValues.map((value) => value.length),
      signatureHeaderPresent: signatureValues.length > 0,
      signatureValuesCount: signatureValues.length,
      signatureValueLengths: signatureValues.map((value) => value.length),
    });
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  const expectedHex = expected.toString('hex');
  const expectedBase64 = expected.toString('base64');

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    const variants = [trimmed];
    if (trimmed.startsWith('sha256=')) {
      variants.push(trimmed.slice(7));
    }

    for (const variant of variants) {
      if (!variant) continue;
      if (variant === secret || variant === expectedHex || variant === expectedBase64) {
        return true;
      }

      const provided = bufferFromSignature(variant);
      if (provided && timingSafeEqual(expected, provided)) {
        return true;
      }
    }
  }

  console.warn('[mailerlite-webhook] signature verification failed', {
    reason: 'no_match',
    candidateCount: candidates.length,
    legacySignatureHeaderPresent: legacySignatureValues.length > 0,
    legacySignatureValuesCount: legacySignatureValues.length,
    legacySignatureValueLengths: legacySignatureValues.map((value) => value.length),
    tokenHeaderPresent: tokenValues.length > 0,
    tokenValuesCount: tokenValues.length,
    tokenValueLengths: tokenValues.map((value) => value.length),
    signatureHeaderPresent: signatureValues.length > 0,
    signatureValuesCount: signatureValues.length,
    signatureValueLengths: signatureValues.map((value) => value.length),
  });
  return false;
}

function parseTimestamp(payload: MailerLiteWebhookPayload): string | undefined {
  const data = payload.data || {};
  const candidates: Array<string | number | undefined> = [
    payload.timestamp,
    payload.date,
    payload.occurred_at,
    data.timestamp,
    data.created_at,
    data.updated_at,
    data.occurred_at,
    payload.campaign?.date,
    data.date,
    data.sent_at,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const fromSeconds = new Date(numeric * (numeric < 10_000_000_000 ? 1000 : 1));
      if (!Number.isNaN(fromSeconds.getTime())) {
        return fromSeconds.toISOString();
      }
    }
  }
  return undefined;
}

function extractEmail(payload: MailerLiteWebhookPayload): string | undefined {
  const data = payload.data || {};
  return (
    payload.subscriber?.email ||
    data.subscriber?.email ||
    data.email ||
    data.recipient_email ||
    data.subscriber_email ||
    data.member?.email_address ||
    undefined
  );
}

function extractCampaignDetails(payload: MailerLiteWebhookPayload) {
  const data = payload.data || {};
  const campaign = payload.campaign || data.campaign || {};
  const campaignName: string | undefined =
    campaign.name || data.campaign_name || data.name || payload.name;
  const subject: string | undefined = campaign.subject || data.subject;
  const campaignId: string | undefined =
    campaign.id || data.campaign_id || data.id || payload.id;
  return { campaignId, campaignName, subject };
}

function mapEventToType(event: string | undefined): { type: string; direction: 'inbound' | 'outbound' } {
  switch (event) {
    case 'campaign.sent':
      return { type: 'newsletter_sent', direction: 'outbound' };
    case 'campaign.open':
    case 'campaign.opened':
      return { type: 'newsletter_open', direction: 'inbound' };
    case 'campaign.click':
    case 'campaign.clicked':
      return { type: 'newsletter_click', direction: 'inbound' };
    case 'campaign.unsubscribed':
      return { type: 'newsletter_unsubscribe', direction: 'inbound' };
    case 'campaign.bounced':
      return { type: 'newsletter_bounce', direction: 'inbound' };
    case 'campaign.complained':
      return { type: 'newsletter_spam', direction: 'inbound' };
    default:
      return { type: event || 'mailerlite_event', direction: 'inbound' };
  }
}

async function resolveContactId(email: string | undefined) {
  if (!email || !sbReady()) return null;
  const response = await sbSelect(`contacts?select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
  if (response.ok && Array.isArray(response.json) && response.json.length) {
    const record = response.json[0] as { id?: string };
    return record?.id ?? null;
  }
  return null;
}

function extractSubscriberIdFromData(data: Record<string, any>): string | undefined {
  const candidates = [
    data.subscriber_id,
    data.id,
    data.subscriber,
    data.recipient_id,
    data.subscriber?.id,
    data.subscriber?.subscriber_id,
    data.member?.id,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      const value = String(candidate).trim();
      if (value) return value;
      continue;
    }
    if (typeof candidate === 'object' && 'id' in candidate) {
      const nested = candidate.id;
      if (nested === null || nested === undefined) continue;
      const value = String(nested).trim();
      if (value) return value;
    }
  }

  return undefined;
}

export function buildExternalId(
  payload: MailerLiteWebhookPayload,
  email: string | undefined,
  event: string | undefined,
  fallbackTimestamp?: string,
) {
  const data = payload.data || {};
  const provided =
    payload.id ||
    data.id ||
    data.event_id ||
    data.history_id ||
    data.log_id ||
    data.uuid ||
    payload.campaign?.id ||
    payload.automation?.id;
  if (provided) return String(provided);
  const timestampPart = fallbackTimestamp ? new Date(fallbackTimestamp).getTime() : Date.now();
  const subscriberPart =
    extractSubscriberIdFromData(data) ||
    payload.subscriber?.id?.toString()?.trim() ||
    payload.subscriber?.subscriber_id?.toString()?.trim() ||
    'anon';
  const emailPart =
    email ||
    payload.subscriber?.email ||
    data.subscriber_email ||
    data.email ||
    'unknown';
  return `${event ?? 'event'}:${subscriberPart}:${emailPart}:${timestampPart}`;
}

export function normalizeEvents(payload: MailerLiteWebhookEnvelope): MailerLiteWebhookPayload[] {
  if (!payload) return [];
  if (Array.isArray(payload.events)) {
    return payload.events.filter((item): item is MailerLiteWebhookPayload => !!item);
  }
  return [payload];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const rawBody = await getRawBody(req);

  if (
    !verifySignature(
      rawBody,
      req.headers['x-mailerlite-signature'],
      req.headers['x-mailerlite-token'],
      req.headers['signature'],
    )
  ) {
    return res.status(401).json({ ok: false, error: 'invalid_signature' });
  }

  let payload: MailerLiteWebhookEnvelope;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as MailerLiteWebhookEnvelope;
  } catch (error) {
    console.error('[mailerlite-webhook] invalid JSON', error);
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  const events = normalizeEvents(payload);

  if (!events.length) {
    return res.status(400).json({ ok: false, error: 'missing_event' });
  }

  if (events.some((event) => (event.event || event.type) === 'webhook.verify')) {
    return res.status(200).json({ ok: true, received: 'verification' });
  }

  if (!sbReady()) {
    console.error('[mailerlite-webhook] Supabase not configured');
    return res.status(500).json({ ok: false, error: 'supabase_not_configured' });
  }

  let inserted = 0;
  let deduplicated = 0;

  for (const item of events) {
    const eventName = item.event || item.type;
    if (!eventName) {
      console.warn('[mailerlite-webhook] skipping event without name', item);
      continue;
    }

    const { type, direction } = mapEventToType(eventName);
    const occurredAt = parseTimestamp(item) ?? new Date().toISOString();
    const email = extractEmail(item);
    const { campaignId, campaignName, subject } = extractCampaignDetails(item);
    const externalId = buildExternalId(item, email, eventName, occurredAt);
    const summaryParts = [eventName];
    if (campaignName) summaryParts.push(campaignName);
    else if (subject) summaryParts.push(subject);
    const content = summaryParts.join(' — ');

    let contactId: string | null = null;
    try {
      contactId = await resolveContactId(email);
    } catch (error) {
      console.warn('[mailerlite-webhook] resolveContactId failed', error);
    }

    const record: InteractionRecord = {
      contact_id: contactId,
      platform: 'mailerlite',
      direction,
      type,
      external_id: String(externalId),
      content: content || null,
      meta: {
        ...item,
        campaign_id: campaignId ?? null,
      },
      occurred_at: occurredAt,
    };

    const response = await sbInsert('interactions', record);
    if (!response.ok) {
      if (response.status === 409) {
        deduplicated += 1;
        continue;
      }
      console.error('[mailerlite-webhook] insert failed', response.status, response.json);
      return res.status(500).json({ ok: false, error: 'insert_failed' });
    }

    inserted += 1;
  }

  return res.status(200).json({ ok: true, processed: events.length, inserted, deduplicated });
}
