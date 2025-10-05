import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureAccessToken, getGmailToken, extractEmailAddress } from '../../../lib/utils/gmail';
import { sbUpsert } from '../../../lib/utils/sb';

const CRON_SECRET = process.env.CRONJOB_API_KEY ?? '';

async function listMessages(accessToken: string, labelId: string, query = 'newer_than:30d', maxResults = 50) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.append('labelIds', labelId);
  url.searchParams.set('q', query);
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail list failed (${response.status}): ${text}`);
  }
  const data = (await response.json()) as { messages?: Array<{ id: string }> };
  return data.messages ?? [];
}

async function fetchMessage(accessToken: string, messageId: string) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`);
  url.searchParams.set('format', 'metadata');
  url.searchParams.append('metadataHeaders', 'Subject');
  url.searchParams.append('metadataHeaders', 'From');
  url.searchParams.append('metadataHeaders', 'To');
  url.searchParams.append('metadataHeaders', 'Date');
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail fetch failed (${response.status}): ${text}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

function extractHeader(headers: unknown, name: string) {
  if (!Array.isArray(headers)) return null;
  const match = headers.find((header) =>
    typeof header === 'object' && header && (header as { name?: string }).name?.toLowerCase() === name.toLowerCase(),
  );
  if (!match) return null;
  return (match as { value?: string }).value ?? null;
}

function parseInternalDate(value: unknown) {
  if (!value) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return new Date(num).toISOString();
}

async function storeMessages(messages: Array<Record<string, unknown>>) {
  if (!messages.length) return { inserted: 0 };
  const payload = messages.map((message) => ({
    gmail_id: message.gmail_id,
    thread_id: message.thread_id ?? null,
    account_email: message.account_email ?? null,
    contact_email: message.contact_email ?? null,
    direction: message.direction ?? null,
    subject: message.subject ?? null,
    snippet: message.snippet ?? null,
    payload: message.payload ?? null,
    history_id: message.history_id ?? null,
    internal_date: message.internal_date ?? null,
  }));
  await sbUpsert('gmail_messages', payload, { returning: 'minimal' });
  return { inserted: payload.length };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!CRON_SECRET) {
    return res.status(500).json({ ok: false, error: 'missing_cron_secret' });
  }

  const tokenParam = typeof req.query.token === 'string' ? req.query.token : undefined;
  const auth = req.headers.authorization;
  const bearer = auth && auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7)
    : auth;
  const providedSecret = bearer || tokenParam;

  if (!providedSecret || providedSecret !== CRON_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const tokenRecord = await getGmailToken();
    if (!tokenRecord) {
      return res.status(412).json({ ok: false, error: 'no_gmail_account' });
    }

    const ensured = await ensureAccessToken(tokenRecord);
    if (!ensured?.access_token) {
      return res.status(500).json({ ok: false, error: 'unable_to_refresh_token' });
    }

    const labels: Array<{ id: string; direction: 'inbound' | 'outbound' }> = [
      { id: 'INBOX', direction: 'inbound' },
      { id: 'SENT', direction: 'outbound' },
    ];

    const messagesToStore: Array<Record<string, unknown>> = [];

    for (const label of labels) {
      const ids = await listMessages(ensured.access_token, label.id);
      for (const item of ids) {
        const message = await fetchMessage(ensured.access_token, item.id);
        const payload = (message.payload as Record<string, unknown>) || {};
        const headers = payload.headers;
        const subject = extractHeader(headers, 'Subject');
        const fromHeader = extractHeader(headers, 'From');
        const toHeader = extractHeader(headers, 'To');
        const dateHeader = extractHeader(headers, 'Date');
        const contactEmail = label.direction === 'inbound' ? extractEmailAddress(fromHeader) : extractEmailAddress(toHeader);
        messagesToStore.push({
          gmail_id: message.id,
          thread_id: message.threadId,
          account_email: ensured.account_email,
          contact_email: contactEmail,
          direction: label.direction,
          subject: subject ?? null,
          snippet: message.snippet ?? null,
          payload: message,
          history_id: message.historyId ?? null,
          internal_date: parseInternalDate(message.internalDate ?? null) ?? (dateHeader ? new Date(dateHeader).toISOString() : null),
        });
      }
    }

    await storeMessages(messagesToStore);

    return res.status(200).json({ ok: true, fetched: messagesToStore.length });
  } catch (error) {
    console.error('gmail sync error', error);
    return res.status(500).json({ ok: false, error: 'sync_failed' });
  }
}
