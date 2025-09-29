const BAD = new Set([
  'full name',
  'fullname',
  'your name',
  'tu nombre',
  'name',
  'n/a',
  'na',
  '-',
  '—',
  'unknown',
  'test',
  'prueba',
  'first name',
  'last name',
  'firstname',
  'lastname'
]);

const PLACEHOLDER_RE = /({{[^}]+}}|{[^}]+}|%7B%7B[^%]+%7D%7D|\{\{[^}]+\}\}|\{[^}]+\}|\[[^\]]+\]|<[^>]+>)/i;
const EMAIL_RE = /@/;
const SPACE = /\s+/g;
const NON_WORD = /[^a-z0-9]+/gi;
const DIAC = /[\u0300-\u036f]/g;

const DM_PATTERNS = [
  /(?:mi\s+nombre\s+es|me\s+llamo|soy)\s+([a-záéíóúñü' ]{2,80})/i,
  /(?:aqui|aquí)?\s*(?:te\s+escribe|te\s+habla|te\s+saluda|quien\s+te\s+escribe\s+es|quien\s+te\s+saluda\s+es|este\s+es)\s+([a-záéíóúñü' ]{2,80})/i,
];

function stripDiacritics(value: string) {
  return value.normalize('NFKD').replace(DIAC, '');
}

function toTitleCase(value: string) {
  return value
    .split(SPACE)
    .filter(Boolean)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

export function sanitizeName(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (EMAIL_RE.test(trimmed)) return undefined;
  if (PLACEHOLDER_RE.test(trimmed)) return undefined;
  if (BAD.has(trimmed.toLowerCase())) return undefined;
  const letters = stripDiacritics(trimmed).replace(/[^A-Za-z]/g, '');
  const digits = trimmed.replace(/\D/g, '');
  if (letters.length < 2) return undefined;
  if (digits.length > Math.max(2, Math.floor(letters.length / 2))) return undefined;
  const normalized = trimmed.replace(/[._\-]+/g, ' ').replace(SPACE, ' ').trim();
  return toTitleCase(normalized);
}

export function isBadName(n?: string | null) {
  if (!n) return true;
  const s = String(n).trim();
  if (!s) return true;
  if (s.length > 100) return true;
  if (EMAIL_RE.test(s)) return true;
  if (PLACEHOLDER_RE.test(s)) return true;
  if (BAD.has(s.toLowerCase())) return true;
  const letters = stripDiacritics(s).replace(/[^A-Za-z]/g, '');
  const digits = s.replace(/\D/g, '');
  if (letters.length < 2) return true;
  if (digits.length > Math.max(2, Math.floor(letters.length / 2))) return true;
  return false;
}

export function humanizeIdentifier(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/^[^a-z0-9]+/i, '').replace(/[^a-z0-9]+$/i, '');
  if (!normalized) return undefined;
  const tokens = normalized.split(NON_WORD).filter(Boolean);
  if (!tokens.length) return undefined;
  return tokens.map((token) => toTitleCase(token)).join(' ');
}

export function deriveNameFromEmail(email?: string | null): string | undefined {
  if (!email) return undefined;
  const trimmed = email.trim();
  if (!trimmed) return undefined;
  const [local] = trimmed.split('@');
  if (!local) return undefined;
  const tokens = local.split(/[._+\-]+/).filter(Boolean);
  if (!tokens.length) return undefined;
  const meaningful = tokens.filter((token) => /[a-zA-Z]/.test(token));
  if (!meaningful.length) return undefined;
  if (meaningful.length === 1 && meaningful[0].length < 3) return undefined;
  const candidate = meaningful.map((token) => toTitleCase(token)).join(' ');
  return candidate || undefined;
}

function extractNameFromDmText(dmText?: string | null): string | undefined {
  if (!dmText) return undefined;
  const normalized = dmText.replace(/\s+/g, ' ').trim();
  for (const pattern of DM_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match?.[1]) continue;
    const candidate = match[1].replace(/[.,;].*$/, '').trim();
    const sanitized = sanitizeName(candidate);
    if (sanitized) return sanitized;
  }
  return undefined;
}

export type DeriveNameInput = {
  igProfileName?: string | null;
  igUsername?: string | null;
  dmText?: string | null;
  email?: string | null;
};

export function deriveName(input: DeriveNameInput): { value: string | null; score: number; source?: string } {
  const igSanitized = sanitizeName(input.igProfileName || undefined);
  if (igSanitized) return { value: igSanitized, score: 0.9, source: 'ig_full_name' };

  const dmSanitized = extractNameFromDmText(input.dmText);
  if (dmSanitized) return { value: dmSanitized, score: 0.75, source: 'dm_text' };

  const usernameHumanized = sanitizeName(humanizeIdentifier(input.igUsername || undefined));
  if (usernameHumanized) return { value: usernameHumanized, score: 0.65, source: 'ig_username' };

  const emailCandidate = sanitizeName(deriveNameFromEmail(input.email));
  if (emailCandidate) return { value: emailCandidate, score: 0.6, source: 'email_local' };

  return { value: null, score: 0, source: undefined };
}
