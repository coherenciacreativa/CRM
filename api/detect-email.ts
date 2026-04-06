import type { VercelRequest, VercelResponse } from '@vercel/node';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

type AnyRecord = Record<string, unknown>;

const BUFFER_KEYS = [
  'buffer',
  'dm_buffer',
  'text',
  'message',
  'input',
  'last_dm_text',
  'last_text_input',
  'last_text',
  'email_raw_from_first_dm',
  'full_text',
  'name',
] as const;

const NESTED_KEYS = ['custom_fields', 'fields', 'data', 'payload', 'contact'] as const;

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value == null ? '' : String(value).trim();

const stripTrailingPunctuation = (value: string): string => value.replace(/[),.;:!?]+$/, '');

function pickByKeys(source: AnyRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const candidate = normalize(source[key]);
    if (candidate) return candidate;
  }
  return '';
}

function extractText(body: unknown): string {
  if (!body || typeof body !== 'object') return '';

  const root = body as AnyRecord;
  const direct = pickByKeys(root, BUFFER_KEYS);
  if (direct) return direct;

  for (const nestedKey of NESTED_KEYS) {
    const nested = root[nestedKey];
    if (nested && typeof nested === 'object') {
      const nestedPicked = pickByKeys(nested as AnyRecord, BUFFER_KEYS);
      if (nestedPicked) return nestedPicked;
    }
  }

  return '';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    const cleaned = extractText(req.body);
    const matches = cleaned.match(EMAIL_REGEX) || [];
    const emails = matches.map(stripTrailingPunctuation).filter(Boolean);
    const email = emails[0] ?? '';

    res.status(200).json({
      ok: true,
      hasEmail: Boolean(email),
      email,
      emails,
    });
  } catch (error) {
    res.status(200).json({ ok: false, hasEmail: false, email: '', emails: [] });
  }
}
