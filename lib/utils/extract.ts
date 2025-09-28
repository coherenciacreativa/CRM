export type EmailGuess = { email: string; confidence: number };

export function extractEmail(raw?: string | null): EmailGuess | null {
  if (!raw) return null;
  const text = String(raw).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!match) return null;
  const found = match[0];
  const [localPart, domain = ''] = found.split('@');
  const email = `${localPart}@${domain.toLowerCase()}`;
  const confidence = text.replace(found, '').trim() === '' ? 0.9 : 0.7;
  return { email, confidence };
}
