import type { NextApiRequest, NextApiResponse } from 'next';
import { sbSelect } from '../../lib/utils/sb.js';

const sanitizeQuery = (input: string): string =>
  input
    .trim()
    .replace(/[%*]/g, '')
    .replace(/\s+/g, ' ');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const raw = typeof req.query.q === 'string' ? req.query.q : '';
  const q = sanitizeQuery(raw);
  if (!q || q.length < 2) {
    return res.status(200).json({ ok: true, matches: [] });
  }

  const like = q.replace(/\s+/g, ' ');
  const pattern = `%${like}%`;
  const qs = new URLSearchParams({
    select: 'id,name,first_name,last_name,email,phone,city,country,instagram_username,ig_user_id,updated_at,created_at',
    order: 'updated_at.desc',
    limit: '10',
  });
  qs.append(
    'or',
    `(
      email.ilike.${pattern},
      name.ilike.${pattern},
      first_name.ilike.${pattern},
      last_name.ilike.${pattern},
      instagram_username.ilike.${pattern}
    )`
      .replace(/\s+/g, ''),
  );

  try {
    const response = await sbSelect(`contacts?${qs.toString()}`);
    if (!response.ok) {
      throw new Error(`Supabase search failed (${response.status})`);
    }

    const matches = Array.isArray(response.json) ? response.json : [];
    return res.status(200).json({ ok: true, matches });
  } catch (error) {
    console.error('search-contact error', error);
    return res.status(500).json({ ok: false, error: 'search_failed' });
  }
}
