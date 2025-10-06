import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbInsert, sbReady, sbSelect } from '../../../lib/utils/sb';

const SECRET = process.env.MAILERLITE_WEBHOOK_SECRET || process.env.MAILERLITE_WEBHOOK_TOKEN || '';

export const config = {
  api: {
    bodyParser: false,
  },
};

type MailerLiteWebhookPayload = {
  event?: string;
  timestamp?: string;
  data?: Record<string, any>;
  id?: string | number;
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

function verifySignature(
  raw: Buffer,
  signatureHeader: string | string[] | undefined,
  tokenHeader: string | string[] | undefined,
): boolean {
  if (!SECRET) return true;

  const candidates = [
    ...normalizeHeaderValues(signatureHeader),
    ...normalizeHeaderValues(tokenHeader),
  ];

  if (!candidates.length) return false;

  const expected = crypto.createHmac('sha256', SECRET).update(raw).digest();
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
      if (variant === SECRET || variant === expectedHex || variant === expectedBase64) {
        return true;
      }

      const provided = bufferFromSignature(variant);
      if (provided && timingSafeEqual(expected, provided)) {
        return true;
      }
    }
  }

  console.warn('[mailerlite-webhook] signature verification failed');
  return false;
}

function parseTimestamp(payload: MailerLiteWebhookPayload): string | undefined {
  const candidates: Array<string | number | undefined> = [
    payload.timestamp,
    payload.data?.timestamp,
    payload.data?.created_at,
    payload.data?.updated_at,
    payload.data?.occurred_at,
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
  const campaign = data.campaign || {};
  const campaignName: string | undefined = campaign.name || data.campaign_name || data.name;
  const subject: string | undefined = campaign.subject || data.subject;
  const campaignId: string | undefined = campaign.id || data.campaign_id || data.id;
  return { campaignId, campaignName, subject };
}

function mapEventToType(event: string | undefined): { type: string; direction: 'inbound' | 'outbound' } {
  switch (event) {
    case 'campaign.sent':
      return { type: 'newsletter_sent', direction: 'outbound' };
    case 'campaign.opened':
      return { type: 'newsletter_open', direction: 'inbound' };
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

function buildExternalId(
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
    data.subscriber_id;
  if (provided) return String(provided);
  const timestampPart = fallbackTimestamp ? new Date(fallbackTimestamp).getTime() : Date.now();
  return `${event ?? 'event'}:${email ?? 'unknown'}:${timestampPart}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const rawBody = await getRawBody(req);

  if (
    !verifySignature(rawBody, req.headers['x-mailerlite-signature'], req.headers['x-mailerlite-token'])
  ) {
    return res.status(401).json({ ok: false, error: 'invalid_signature' });
  }

  let payload: MailerLiteWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as MailerLiteWebhookPayload;
  } catch (error) {
    console.error('[mailerlite-webhook] invalid JSON', error);
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  if (payload?.event === 'webhook.verify') {
    return res.status(200).json({ ok: true, received: 'verification' });
  }

  const event = payload?.event;
  if (!event) {
    return res.status(400).json({ ok: false, error: 'missing_event' });
  }

  const { type, direction } = mapEventToType(event);
  const occurredAt = parseTimestamp(payload) ?? new Date().toISOString();
  const email = extractEmail(payload);
  const { campaignId, campaignName, subject } = extractCampaignDetails(payload);
  const externalId = buildExternalId(payload, email, event, occurredAt);
  const summaryParts = [event];
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
      ...payload,
      campaign_id: campaignId ?? null,
    },
    occurred_at: occurredAt,
  };

  if (!sbReady()) {
    console.error('[mailerlite-webhook] Supabase not configured');
    return res.status(500).json({ ok: false, error: 'supabase_not_configured' });
  }

  const response = await sbInsert('interactions', record);
  if (!response.ok) {
    if (response.status === 409) {
      return res.status(200).json({ ok: true, deduplicated: true });
    }
    console.error('[mailerlite-webhook] insert failed', response.status, response.json);
    return res.status(500).json({ ok: false, error: 'insert_failed' });
  }

  return res.status(200).json({ ok: true });
}
