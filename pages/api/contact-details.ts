import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbSelect } from '../../lib/utils/sb';

const execFileAsync = promisify(execFile);

const MAILERLITE_KEY =
  process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || process.env.ML_API_KEY || '';

const buildMailerLiteSummary = (payload: unknown, email?: string) => {
  const items = Array.isArray((payload as { data?: unknown }).data)
    ? ((payload as { data?: unknown[] }).data as unknown[])
    : Array.isArray(payload)
      ? (payload as unknown[])
      : [];
  if (!items.length) return null;
  const normalizedTarget = email ? email.trim().toLowerCase() : null;
  let subscriber = items[0] as Record<string, unknown>;
  if (normalizedTarget) {
    for (const item of items) {
      const candidate = (item as Record<string, unknown>)?.email;
      if (typeof candidate === 'string' && candidate.trim().toLowerCase() === normalizedTarget) {
        subscriber = item as Record<string, unknown>;
        break;
      }
    }
  }
  const fields = (subscriber?.fields as Record<string, unknown>) || {};
  return {
    id: subscriber?.id,
    email: subscriber?.email,
    status: subscriber?.status,
    name: (subscriber?.name as string | undefined) ?? (fields?.name as string | undefined) ?? null,
    fields,
    groups: (subscriber?.groups as unknown[]) ?? [],
    created_at: subscriber?.created_at ?? null,
    updated_at: subscriber?.updated_at ?? null,
  };
};

async function fetchMailerLiteSubscriber(email: string) {
  if (!MAILERLITE_KEY || !email) return null;
  try {
    const url = new URL('https://connect.mailerlite.com/api/subscribers');
    url.searchParams.set('search', email);
    url.searchParams.set('limit', '50');
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${MAILERLITE_KEY}`,
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Mailerlite request failed (${response.status})`);
    }

    const data = await response.json();
    return buildMailerLiteSummary(data, email);
  } catch (error) {
    console.error('contact-details mailerlite error', error);
    return { error: true };
  }
}

async function fetchMailerLiteViaCurl(email: string) {
  if (!MAILERLITE_KEY || !email) return null;
  try {
    const { stdout } = await execFileAsync('curl', [
      '--http2',
      '--silent',
      '--show-error',
      '--compressed',
      '--globoff',
      '-H', `Authorization: Bearer ${MAILERLITE_KEY}`,
      '-H', 'Accept: application/json',
      '-H',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      `https://connect.mailerlite.com/api/subscribers?search=${encodeURIComponent(email)}&limit=50`,
    ]);

    if (!stdout) return null;
    const data = JSON.parse(stdout);
    return buildMailerLiteSummary(data, email);
  } catch (error) {
    console.error('contact-details mailerlite curl fallback error', error);
    return { error: true };
  }
}

async function fetchSupabaseContact(id?: string, email?: string) {
  if (id) {
    const response = await sbSelect(`contacts?id=eq.${encodeURIComponent(id)}&limit=1`);
    if (response.ok && Array.isArray(response.json) && response.json.length) {
      return response.json[0];
    }
  }

  if (email) {
    const response = await sbSelect(`contacts?email=eq.${encodeURIComponent(email)}&limit=1`);
    if (response.ok && Array.isArray(response.json) && response.json.length) {
      return response.json[0];
    }
  }
  return null;
}

async function fetchInteractions(contactId: string) {
  const response = await sbSelect(
    `interactions?contact_id=eq.${encodeURIComponent(contactId)}&order=occurred_at.desc&limit=10`,
  );
  if (!response.ok || !Array.isArray(response.json)) return [];
  return response.json;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  const email = typeof req.query.email === 'string' ? req.query.email : undefined;

  if (!id && !email) {
    return res.status(400).json({ ok: false, error: 'missing_identifier' });
  }

  try {
    const contact = await fetchSupabaseContact(id, email);
    if (!contact) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    const [interactions, mailerliteFetch] = await Promise.all([
      fetchInteractions(contact.id as string),
      contact.email ? fetchMailerLiteSubscriber(String(contact.email)) : Promise.resolve(null),
    ]);

    let mailerlite = mailerliteFetch;
    if (contact.email && (!mailerlite || (mailerlite as { error?: boolean })?.error)) {
      mailerlite = await fetchMailerLiteViaCurl(String(contact.email));
    }

    return res.status(200).json({ ok: true, contact, interactions, mailerlite });
  } catch (error) {
    console.error('contact-details error', error);
    return res.status(500).json({ ok: false, error: 'detail_failed' });
  }
}
