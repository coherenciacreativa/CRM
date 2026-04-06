import type { NextApiRequest, NextApiResponse } from 'next';
import { parseFullName } from '../../lib/names/parseFullName';

type AnyRecord = Record<string, unknown>;

const NAME_KEYS = [
  'name',
  'name_raw_first_reply',
  'full_name',
  'last_text_input',
  'last_text',
  'text',
  'message',
  'buffer',
  'dm_buffer',
] as const;

const NESTED_KEYS = ['custom_fields', 'fields', 'data', 'payload', 'contact'] as const;

function toCleanString(value: unknown): string {
  if (value == null) return '';
  const text = String(value).trim();
  return text;
}

function pickByKeys(source: AnyRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const picked = toCleanString(source[key]);
    if (picked) return picked;
  }
  return '';
}

function extractName(body: unknown): string {
  if (!body || typeof body !== 'object') return '';

  const root = body as AnyRecord;
  const direct = pickByKeys(root, NAME_KEYS);
  if (direct) return direct;

  for (const nestedKey of NESTED_KEYS) {
    const nested = root[nestedKey];
    if (nested && typeof nested === 'object') {
      const nestedPicked = pickByKeys(nested as AnyRecord, NAME_KEYS);
      if (nestedPicked) return nestedPicked;
    }
  }

  return '';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: false, error: 'method_not_allowed' });
    }

    const name = extractName(req.body);
    const parsed = parseFullName(name);
    return res.status(200).json({ ok: true, ...parsed });
  } catch (error) {
    console.error('parse-name error', error);
    return res.status(200).json({ ok: false, error: 'parse_error' });
  }
}
