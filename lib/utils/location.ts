import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cities: Array<{ city: string; country?: string; syn?: string[] }> =
  require('../../data/latam_cities.min.json');

export type LocationGuess = { city?: string; country?: string; score: number; source: 'dm_text' | 'ig' };

const COUNTRIES = [
  'argentina','bolivia','brasil','brazil','chile','colombia','costa rica','cuba','ecuador','el salvador',
  'guatemala','haiti','haití','honduras','mexico','méxico','nicaragua','panama','panamá','paraguay',
  'peru','perú','puerto rico','república dominicana','republica dominicana','uruguay','venezuela'
];

const STOPWORDS = new Set([
  'la',
  'el',
  'los',
  'las',
  'de',
  'del',
  'en',
  'es',
  'mi',
  'correo',
  'mail',
  'email',
  'ciudad',
  'capital',
  'region',
  'región',
  'estado',
  'provincia',
  'municipio',
  'bella',
  'bonita',
  'hermosa',
  'linda',
  'preciosa',
  'lindisima',
  'lindísima',
  'maravillosa',
]);

const SPACE = /\s+/g;
const DIAC = /[\u0300-\u036f]/g;

const LOCATION_SEGMENT_STOP_RE =
  /\b(gracias|grac\s?ias|claro|mensaje|correo|email|mail|proyecto|depresi(?:[óo]n)?|salida|proceso|años|ano|bendiciones|familia|ayuda|apoyo|obsequio)\b/i;

const NATIONALITY_COUNTRY = new Map<string, string>([
  ['colombiana', 'Colombia'],
  ['colombiano', 'Colombia'],
  ['mexicana', 'México'],
  ['mexicano', 'México'],
  ['peruana', 'Perú'],
  ['peruano', 'Perú'],
  ['chilena', 'Chile'],
  ['chileno', 'Chile'],
  ['argentina', 'Argentina'],
  ['argentino', 'Argentina'],
  ['venezolana', 'Venezuela'],
  ['venezolano', 'Venezuela'],
  ['ecuatoriana', 'Ecuador'],
  ['ecuatoriano', 'Ecuador'],
  ['uruguaya', 'Uruguay'],
  ['uruguayo', 'Uruguay'],
  ['boliviana', 'Bolivia'],
  ['boliviano', 'Bolivia'],
]);

function strip(value: string) {
  return value.normalize('NFKD').replace(DIAC, '').toLowerCase().trim();
}

function title(value: string) {
  return value
    .split(SPACE)
    .filter(Boolean)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

type Entry = { key: string; city: string; country?: string };
const INDEX: Entry[] = [];

for (const item of cities as Array<{ city: string; country?: string; syn?: string[] }>) {
  const base = strip(item.city);
  INDEX.push({ key: base, city: item.city, country: item.country });
  const syn = Array.isArray(item.syn) ? item.syn : [];
  for (const alias of syn) {
    INDEX.push({ key: strip(alias), city: item.city, country: item.country });
  }
}

function bestCityMatch(raw: string) {
  const query = strip(raw);
  if (!query) return null;
  let best: { entry: Entry; dist: number } | null = null;
  for (const entry of INDEX) {
    const distance = levenshtein(query, entry.key);
    if (!best || distance < best.dist) {
      best = { entry, dist: distance };
    }
    if (best.dist === 0) break;
  }
  if (!best) return null;
  const ratio = best.dist / Math.max(3, query.length);
  if (ratio <= 0.3) {
    const score = 0.9 - ratio * 0.5;
    return { city: best.entry.city, country: best.entry.country, score };
  }
  return null;
}

function tryCountry(raw: string) {
  const query = strip(raw);
  if (!query) return null;
  const match = COUNTRIES.find((c) => levenshtein(query, c) <= Math.ceil(Math.max(1, query.length * 0.2)));
  if (!match) return null;
  const mapping: Record<string, string> = {
    mexico: 'México',
    peru: 'Perú',
    panama: 'Panamá',
    haiti: 'Haití',
    'republica dominicana': 'República Dominicana',
  };
  const normalized = strip(match);
  return mapping[normalized] || title(match);
}

function extractPhrase(input?: string) {
  if (!input) return '';
  const normal = ` ${input.replace(/\s+/g, ' ').trim()} `;
  const pattern =
    /\b(?:en|desde|soy de|soy originari[ao] de|vivo en|vivo entre|me encuentro en|estoy en|resido en|radico en|de la ciudad de|la ciudad de)\s+(.+)/i;
  const match = normal.match(pattern);
  if (!match) return '';
  let candidate = match[1] ?? '';
  candidate = candidate
    .replace(/\b(ciudad|capital|de|del|la|el|los|las|bella|bonita|hermosa|linda|preciosa|lindisima|lindísima|maravillosa)\b/gi, ' ')
    .replace(/\b(?:el|la)?\s*pueblo\s+se\s+llama\b/gi, ' ')
    .replace(/\b(?:el|la)?\s*ciudad\s+se\s+llama\b/gi, ' ')
    .replace(/\bentre\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bmi\s+(?:correo|mail|email|whatsapp|celular)\b.*$/i, '')
    .replace(/\b(?:correo|mail|email)\s+es\b.*$/i, '')
    .replace(/\bpuedes?\s+escrib(?:ir|irme)\b.*$/i, '')
    .replace(/\bpueden\s+escribirme\b.*$/i, '')
    .replace(/\bmi\s+n[úu]mero\b.*$/i, '')
    .replace(/[?.!]+$/g, '')
    .trim();
  return candidate;
}

const cleanSegment = (segment: string) =>
  segment
    .replace(/\b(?:el|la)?\s*pueblo\s+se\s+llama\b/gi, ' ')
    .replace(/\b(?:el|la)?\s*ciudad\s+se\s+llama\b/gi, ' ')
    .replace(/\bentre\b/gi, ' ')
    .replace(/\bmi\s+(?:correo|mail|email|whatsapp|celular)\b.*$/i, '')
    .replace(/\b(?:correo|mail|email)\s+es\b.*$/i, '')
    .replace(/\bpuedes?\s+escrib(?:ir|irme)\b.*$/i, '')
    .replace(/\bpueden\s+escribirme\b.*$/i, '')
    .replace(/\bmi\s+n[úu]mero\b.*$/i, '')
    .replace(/[?.!]+$/g, '')
    .trim();

export function extractLocationFromText(dm?: string): LocationGuess | null {
  const phrase = extractPhrase(dm);
  if (!phrase) return null;

  const lowered = phrase.toLowerCase();
  let nationalityCountry: string | undefined;
  for (const [keyword, country] of NATIONALITY_COUNTRY.entries()) {
    if (lowered.includes(keyword)) {
      nationalityCountry = country;
      break;
    }
  }

  const normalizedPhrase = phrase.replace(/\b(?:y|e)\b/gi, ',');
  const parts = normalizedPhrase
    .split(/,|\s-\s/)
    .map((p) => cleanSegment(p.trim()))
    .filter((segment) => segment && !LOCATION_SEGMENT_STOP_RE.test(segment));

  const commaParts = phrase
    .split(',')
    .map((p) => cleanSegment(p.trim()))
    .filter((segment) => segment && !LOCATION_SEGMENT_STOP_RE.test(segment));
  if (commaParts.length >= 2) {
    let commaCountry = nationalityCountry;
    const firstPartCountry = tryCountry(commaParts[0]);
    if (firstPartCountry) commaCountry = firstPartCountry;
    const commaCity = commaParts.slice(1).find((segment) => {
      if (segment.length < 3) return false;
      const countryMatch = tryCountry(segment);
      if (countryMatch) {
        const normalizedSegment = strip(segment);
        const normalizedCountry = strip(countryMatch);
        if (normalizedSegment === normalizedCountry) return false;
      }
      return true;
    });
    if (commaCity) {
      return {
        city: title(commaCity),
        country: commaCountry || tryCountry(commaParts[0]) || nationalityCountry,
        score: 0.65,
        source: 'dm_text',
      };
    }
  }

  let detectedCountry = nationalityCountry;
  for (const segment of parts) {
    const maybeCountry = tryCountry(segment);
    if (maybeCountry) {
      detectedCountry = maybeCountry;
      break;
    }
  }

  for (const segment of parts) {
    const match = bestCityMatch(segment);
    if (match) {
      return {
        ...match,
        country: match.country || detectedCountry,
        source: 'dm_text',
      };
    }
  }

  const tokens = parts.length ? parts : normalizedPhrase.split(' ');
  if (tokens.length >= 2) {
    const maybeCountry = tryCountry(tokens[tokens.length - 1]);
    if (maybeCountry) {
      const cityCandidate = tokens
        .slice(0, tokens.length - 1)
        .filter((w) => !STOPWORDS.has(strip(w)))
        .join(' ')
        .trim();
      const match = bestCityMatch(cityCandidate);
      if (match) {
        return { ...match, country: match.country || maybeCountry, source: 'dm_text' };
      }
      if (cityCandidate.length >= 3) {
        return { city: title(cityCandidate), country: maybeCountry, score: 0.55, source: 'dm_text' };
      }
    }
  }

  for (const part of parts) {
    const matchCity = bestCityMatch(part);
    if (matchCity) {
      return {
        ...matchCity,
        country: matchCity.country || nationalityCountry,
        source: 'dm_text',
      };
    }
  }

  const match = bestCityMatch(phrase);
  if (match) {
    return { ...match, country: match.country || detectedCountry, source: 'dm_text' };
  }

  if (parts.length) {
    const fallbackSegment = parts.find((segment) => {
      if (segment.length < 3) return false;
      const countryMatch = tryCountry(segment);
      if (countryMatch) {
        const normalizedSegment = strip(segment);
        const normalizedCountry = strip(countryMatch);
        if (normalizedSegment === normalizedCountry) return false;
        if (countryMatch === detectedCountry) return false;
      }
      return true;
    });
    if (fallbackSegment) {
      return { city: title(fallbackSegment), country: detectedCountry, score: 0.5, source: 'dm_text' };
    }
  }

  const rough = phrase
    .split(' ')
    .filter((w) => !STOPWORDS.has(strip(w)))
    .slice(0, 3)
    .join(' ')
    .trim();
  if (rough.length >= 3) {
    return { city: title(rough), country: detectedCountry, score: 0.5, source: 'dm_text' };
  }

  if (detectedCountry) {
    return { country: detectedCountry, score: 0.4, source: 'dm_text' };
  }

  return null;
}
