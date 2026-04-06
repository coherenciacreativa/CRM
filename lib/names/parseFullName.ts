export type ParsedName = {
  hasSurname: boolean;
  firstName: string;
  lastName: string;
  normalized: string;
};

const CONNECTORS = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'da',
  'do',
  'dos',
  'das',
  'y',
  'e',
  'van',
  'von',
  'di',
  'du',
  'le',
  'san',
  'santa',
]);

const COMMON_GIVEN = new Set([
  'maria',
  'maría',
  'jose',
  'josé',
  'ana',
  'joao',
  'joão',
  'juan',
  'luis',
  'carlos',
  'pedro',
  'miguel',
  'diego',
  'sofia',
  'sofía',
  'lucia',
  'lucía',
  'andres',
  'andrés',
  'david',
  'daniel',
  'gabriel',
  'camila',
  'valentina',
]);

const NON_NAME_WORDS = new Set([
  'no',
  'nop',
  'quiero',
  'prefiero',
  'decir',
  'decirlo',
  'digo',
  'compartir',
  'responder',
  'ahora',
  'luego',
  'despues',
  'después',
  'gracias',
  'ninguno',
  'ninguna',
  'ningun',
  'ningún',
]);

export function normalizeName(raw: string): string {
  return (raw ?? '')
    .toString()
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{M}\s\-']/gu, '');
}

const INTRO_PATTERNS = [
  /\b(?:me\s+llamo|mi\s+nombre\s+es|mi\s+nombre)\s+(.+)$/i,
  /\b(?:yo\s+soy|soy)\s+(.+)$/i,
];

const LEADING_GREETING_RE =
  /^(?:hola|buenas|buenos\s+d[ií]as|buen\s+d[ií]a|buenas\s+tardes|buenas\s+noches|hello|hi|hey)\b\s*/i;

const TRAILING_SMALL_TALK_RE =
  /\b(?:mucho\s+gusto|encantad[oa]|gracias(?:\s+.+)?|saludos?)\b.*$/i;

function preprocessCandidate(raw: string): string {
  const cleaned = normalizeName(raw);
  if (!cleaned) return '';

  let candidate = cleaned.replace(LEADING_GREETING_RE, '').trim();

  for (const pattern of INTRO_PATTERNS) {
    const match = candidate.match(pattern);
    if (match?.[1]) {
      candidate = normalizeName(match[1]);
      break;
    }
  }

  candidate = candidate.replace(TRAILING_SMALL_TALK_RE, '').trim();
  candidate = normalizeName(candidate);

  return candidate || cleaned;
}

function looksLikeNonName(candidate: string): boolean {
  const normalized = normalizeName(candidate).toLowerCase();
  if (!normalized) return true;

  if (/^(?:n\/?a|none|null|no)$/i.test(normalized)) return true;

  const words = normalized.split(' ').filter(Boolean);
  if (!words.length) return true;

  const nonNameHits = words.filter((word) => NON_NAME_WORDS.has(word)).length;
  if (nonNameHits >= 2) return true;

  // Si viene una frase larga y contiene verbos/conectores conversacionales, mejor no asumir nombre.
  if (words.length >= 3 && nonNameHits >= 1) return true;

  return false;
}

export function parseFullName(raw: string): ParsedName {
  const cleaned = preprocessCandidate(raw);
  if (!cleaned || looksLikeNonName(cleaned)) {
    return { hasSurname: false, firstName: '', lastName: '', normalized: '' };
  }

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < 2) {
    return { hasSurname: false, firstName: cleaned, lastName: '', normalized: cleaned };
  }

  if (parts.length === 2 && COMMON_GIVEN.has(parts[1].toLowerCase())) {
    return { hasSurname: false, firstName: cleaned, lastName: '', normalized: cleaned };
  }

  let i = parts.length - 1;
  const last: string[] = [parts[i--]];
  while (i >= 0 && CONNECTORS.has(parts[i].toLowerCase())) {
    last.unshift(parts[i--]);
  }

  const lastName = last.join(' ');
  const firstName = parts.slice(0, i + 1).join(' ');
  const hasSurname = Boolean(firstName && lastName);

  if (!hasSurname) {
    return { hasSurname: false, firstName: cleaned, lastName: '', normalized: cleaned };
  }

  return { hasSurname, firstName, lastName, normalized: cleaned };
}
