import type { VercelRequest, VercelResponse } from '@vercel/node';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const stripTrailingPunctuation = (value: string): string => value.replace(/[),.;:!?]+$/, '');

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    const rawBuffer = (req.body as { buffer?: unknown })?.buffer;
    const cleaned = normalize(rawBuffer);
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
