import type { VercelRequest, VercelResponse } from '@vercel/node';

type ManyChatCustomField = Record<string, unknown> | Array<{
  id?: string | number;
  name?: string;
  title?: string;
  value?: unknown;
}>;

type ManyChatContact = {
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

type ManyChatPayload = {
  event?: string;
  timestamp?: number | string;
  source?: string;
  contact?: ManyChatContact;
  message?: { text?: string; type?: string };
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

const SECRET_HEADER = 'x-webhook-secret';
const SUPABASE_URL = process.env.SUPABASE_URL_CRM;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_CRM;

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

const lower = (value: unknown): string => (typeof value === 'string' ? value.toLowerCase() : '');

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

  if (Array.isArray(fields)) {
    for (const name of candidates) {
      const match = fields.find((field) => lower(field?.name ?? field?.title) === name);
      if (match?.value != null && match.value !== '') {
        return safetyString(match.value);
      }
    }
    return undefined;
  }

  for (const name of candidates) {
    const value = (fields as Record<string, unknown>)[name];
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

  const rawEmail = safetyString(contact.email) ?? safetyString(contact.emails && pickFirst(contact.emails));
  const rawPhone = safetyString(contact.phone) ?? safetyString(contact.phones && pickFirst(contact.phones));

  const email = safetyString(customEmail ?? rawEmail ?? fallbackString(payload, 'contact_email'));
  const phone = safetyString(customPhone ?? rawPhone ?? fallbackString(payload, 'contact_phone'));
  const manychatId = safetyString(contact.id) ?? fallbackString(payload, 'contact_id');

  const name = safetyString(contact.name) ?? [safetyString(contact.first_name), safetyString(contact.last_name)]
    .filter(Boolean)
    .join(' ')
    .trim();

  const record: Record<string, unknown> = {
    manychat_contact_id: manychatId,
    name: name || undefined,
    first_name: safetyString(contact.first_name),
    last_name: safetyString(contact.last_name),
    email,
    phone,
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

const insertInteraction = async (
  contactId: string,
  payload: ManyChatPayload,
  platformHint: 'instagram' | 'other',
  manychatContactId?: string,
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

  const record = {
    contact_id: contactId,
    platform: platformHint,
    direction: 'inbound',
    type: payload.event ? `manychat_${payload.event}` : 'manychat_webhook',
    external_id: externalIdParts.join(':'),
    content: safetyString(payload.message?.text) ?? fallbackString(payload, 'last_text_input'),
    meta: payload,
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

const validateSecret = (req: VercelRequest): boolean => {
  const expected = safetyString(process.env.MANYCHAT_WEBHOOK_SECRET);
  if (!expected) return true;
  const receivedHeader = req.headers[SECRET_HEADER] ?? req.headers[SECRET_HEADER as keyof typeof req.headers];
  const received = Array.isArray(receivedHeader) ? receivedHeader[0] : receivedHeader;
  return safetyString(received) === expected;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    if (!validateSecret(req)) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const payload = (req.body ?? {}) as ManyChatPayload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }

    const { record, contact } = extractContactRecord(payload);
    if (!record.manychat_contact_id) {
      return res.status(400).json({ ok: false, error: 'Missing ManyChat contact id' });
    }

    const contactRow = await insertContact(record);

    const platformHint = record.instagram_username || record.ig_user_id ? 'instagram' : 'other';

    try {
      await insertInteraction(contactRow.id as string, payload, platformHint, record.manychat_contact_id as string | undefined);
    } catch (interactionError) {
      console.error('Failed to insert interaction', interactionError);
    }

    console.log('ManyChat webhook processed', {
      contact_id: contactRow.id,
      manychat_contact_id: record.manychat_contact_id,
      event: payload.event,
    });

    return res.status(200).json({
      ok: true,
      contact_id: contactRow.id,
      manychat_contact_id: record.manychat_contact_id,
      event: payload.event ?? null,
    });
  } catch (error) {
    console.error('ManyChat webhook error', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
