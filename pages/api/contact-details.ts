import type { NextApiRequest, NextApiResponse } from 'next';
import { sbSelect } from '../../lib/utils/sb';

const MAILERLITE_KEY =
  process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || process.env.ML_API_KEY || '';

async function fetchMailerLiteSubscriber(email: string) {
  if (!MAILERLITE_KEY || !email) return null;
  try {
    const url = new URL('https://connect.mailerlite.com/api/subscribers');
    url.searchParams.set('filter[email]', email);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${MAILERLITE_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Mailerlite request failed (${response.status})`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    if (!items.length) return null;
    const subscriber = items[0];
    return {
      id: subscriber?.id,
      email: subscriber?.email,
      status: subscriber?.status,
      name: subscriber?.name ?? subscriber?.fields?.name ?? null,
      fields: subscriber?.fields ?? {},
      groups: subscriber?.groups ?? [],
      created_at: subscriber?.created_at ?? null,
      updated_at: subscriber?.updated_at ?? null,
    };
  } catch (error) {
    console.error('contact-details mailerlite error', error);
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

    const [interactions, mailerlite] = await Promise.all([
      fetchInteractions(contact.id as string),
      contact.email ? fetchMailerLiteSubscriber(String(contact.email)) : Promise.resolve(null),
    ]);

    return res.status(200).json({ ok: true, contact, interactions, mailerlite });
  } catch (error) {
    console.error('contact-details error', error);
    return res.status(500).json({ ok: false, error: 'detail_failed' });
  }
}
