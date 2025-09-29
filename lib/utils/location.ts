import cities from '../../data/latam_cities.min.json' assert { type: 'json' };

export type LocationGuess = { city?: string; country?: string; score: number; source: 'dm_text' | 'ig' };

const COUNTRIES = [
  'argentina','bolivia','brasil','brazil','chile','colombia','costa rica','cuba','ecuador','el salvador',
  'guatemala','haiti','haití','honduras','mexico','méxico','nicaragua','panama','panamá','paraguay',
  'peru','perú','puerto rico','república dominicana','republica dominicana','uruguay','venezuela'
];

const STOPWORDS = new Set([
  'la','el','los','las','de','del','en',
  'ciudad','capital','region','región','estado','provincia','municipio',
  'bella','bonita','hermosa','linda','preciosa','lindisima','lindísima','maravillosa'
]);

const SPACE = /\s+/g;
const DIAC = /[\u0300-\u036f]/g;

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
    /\b(?:en|desde|soy de|vivo en|me encuentro en|estoy en|resido en|radico en|de la ciudad de|la ciudad de)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ\.\-'\s]{2,})/i;
  const match = normal.match(pattern);
  if (!match) return '';
  let candidate = match[1]?.split(/[.;,\n]/)[0]?.trim() ?? '';
  candidate = candidate
    .replace(/\b(ciudad|capital|de|del|la|el|los|las|bella|bonita|hermosa|linda|preciosa|lindisima|lindísima|maravillosa)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return candidate;
}

export function extractLocationFromText(dm?: string): LocationGuess | null {
  const phrase = extractPhrase(dm);
  if (!phrase) return null;

  const parts = phrase.split(/,|\s-\s/).map((p) => p.trim()).filter(Boolean);
  const tokens = parts.length === 1 ? phrase.split(' ') : parts;

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

  const match = bestCityMatch(phrase);
  if (match) {
    return { ...match, source: 'dm_text' };
  }

  const rough = phrase
    .split(' ')
    .filter((w) => !STOPWORDS.has(strip(w)))
    .slice(0, 3)
    .join(' ')
    .trim();
  if (rough.length >= 3) {
    return { city: title(rough), score: 0.5, source: 'dm_text' };
  }

  return null;
}
