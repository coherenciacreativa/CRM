import type { NextApiRequest, NextApiResponse } from 'next';
import { parseFullName } from '../../lib/names/parseFullName';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: false, error: 'method_not_allowed' });
    }

    const nameValue = req.body && typeof req.body === 'object' ? (req.body as { name?: unknown }).name : undefined;
    const name = nameValue == null ? '' : nameValue.toString();
    const parsed = parseFullName(name);
    return res.status(200).json({ ok: true, ...parsed });
  } catch (error) {
    console.error('parse-name error', error);
    return res.status(200).json({ ok: false, error: 'parse_error' });
  }
}
