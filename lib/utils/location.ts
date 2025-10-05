import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cities: Array<{ city: string; country?: string; syn?: string[] }> =
  require('../../data/latam_cities.min.json');

export type LocationGuess = { city?: string; country?: string; score: number; source: 'dm_text' | 'ig' };

const COUNTRIES = [
  'argentina','bolivia','brasil','brazil','chile','colombia','costa rica','cuba','ecuador','el salvador',
  'guatemala','haiti','haití','honduras','mexico','méxico','nicaragua','panama','panamá','paraguay',
  'peru','perú','puerto rico','república dominicana','republica dominicana','uruguay','venezuela',
  'estados unidos','united states','usa','u.s.a','u.s.a.','eeuu','e.e.u.u','canada','canadá'
];

const STOPWORDS = new Set([
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

const TRAILING_CONNECTORS = new Set([
  'en',
  'del',
  'de',
  'al',
  'a',
  'la',
  'el',
  'los',
  'las',
  'por',
  'para',
  'con',
]);

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

const trimTrailingConnectors = (tokens: string[]): string[] => {
  const result = [...tokens];
  while (result.length > 1) {
    const last = result[result.length - 1];
    if (!last) break;
    const normalized = strip(last);
    if (!normalized || !TRAILING_CONNECTORS.has(normalized)) break;
    result.pop();
  }
  return result;
};

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

function lookupCountry(city: string | undefined) {
  if (!city) return undefined;
  const key = strip(city);
  if (!key) return undefined;
  for (const entry of INDEX) {
    if (entry.key === key && entry.country) {
      return entry.country;
    }
  }
  return undefined;
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

const cleanCandidateValue = (value: string) =>
  value
    .replace(/\b(ciudad|capital|de|del|bella|bonita|hermosa|linda|preciosa|lindisima|lindísima|maravillosa)\b/gi, ' ')
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

function extractPhrase(input?: string) {
  if (!input) return '';
  const normal = ` ${input.replace(/\s+/g, ' ').trim()} `;
  const pattern =
    /\b(?:en|desde|soy de|soy originari[ao] de|vivo en|vivo entre|me encuentro en|estoy en|resido en|radico en|de la ciudad de|la ciudad de)\s+(.+)/i;
  const match = normal.match(pattern);
  if (match) {
    const initial = cleanCandidateValue(match[1] ?? '');
    if (initial) return initial;
  }

  const labelPattern = /\b(?:pa[ií]s(?:es)?(?:\s+y\s+ciudad)?|ciudad(?:\s+y\s+pa[ií]s)?|ubicaci[óo]n)\b/i;
  for (const line of input.split(/\r?\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [label, rest] = trimmed.split(/:\s*/, 2);
    if (!rest) continue;
    if (!labelPattern.test(label)) continue;
    const candidate = cleanCandidateValue(rest);
    if (candidate) return candidate;
  }

  return '';
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

  const finalizeResult = (
    city: string | undefined,
    country: string | undefined,
    score: number,
  ): LocationGuess | null => {
    let resolvedScore = score;
    let resolvedCountry = country ? tryCountry(country) : undefined;
    let resolvedCity: string | undefined;

    if (city) {
      const cityMatch = bestCityMatch(city);
      if (cityMatch) {
        resolvedCity = cityMatch.city;
        if (!resolvedCountry && cityMatch.country) {
          resolvedCountry = cityMatch.country;
        }
        if (typeof cityMatch.score === 'number') {
          resolvedScore = Math.max(resolvedScore, cityMatch.score);
        } else {
          resolvedScore = Math.max(resolvedScore, 0.6);
        }
      } else {
        const cityAsCountry = tryCountry(city);
        if (cityAsCountry) {
          resolvedCountry = resolvedCountry ?? cityAsCountry;
        }
      }
    }

    const rawCityTokens = city ? trimTrailingConnectors(city.split(/\s+/).filter(Boolean)) : [];

    if (!resolvedCity && city) {
      const trimmedCity = city.trim();
      if (trimmedCity) {
        const loweredCity = strip(trimmedCity);
        const cityTokens = trimTrailingConnectors(trimmedCity.split(/\s+/).filter(Boolean));
        const invalidCityKeywords = [
          'pais',
          'país',
          'estado',
          'estados',
          'unidos',
          'viviendo',
          'actualmente',
          'ahora',
          'vivir',
          'vivo',
          'poco',
          'conocido',
        ];
        const containsInvalid = invalidCityKeywords.some((keyword) => loweredCity.includes(keyword));
        if (!containsInvalid && cityTokens.length) {
          resolvedCity = title(cityTokens.join(' '));
        }
      }
    }

    if (resolvedCity && !resolvedCountry) {
      const inferredCountry = lookupCountry(resolvedCity);
      if (inferredCountry) {
        resolvedCountry = inferredCountry;
      }
    }

    const tokensForSplit = trimTrailingConnectors((resolvedCity ?? city ?? '').split(/\s+/).filter(Boolean));
    if (tokensForSplit.length >= 2) {
      for (let suffix = 1; suffix < tokensForSplit.length; suffix += 1) {
        const tail = tokensForSplit.slice(tokensForSplit.length - suffix).join(' ');
        const matchedCountry = tryCountry(tail);
        if (!matchedCountry) continue;

        if (!resolvedCountry) {
          resolvedCountry = matchedCountry;
        }

        const cityPortion = trimTrailingConnectors(tokensForSplit.slice(0, tokensForSplit.length - suffix));
        if (cityPortion.length) {
          const candidateCity = title(cityPortion.join(' '));
          const matchedCity = bestCityMatch(candidateCity);
          if (matchedCity) {
            resolvedCity = matchedCity.city;
            if (!resolvedCountry && matchedCity.country) {
              resolvedCountry = matchedCity.country;
            }
          } else {
            resolvedCity = candidateCity;
          }
        } else {
          resolvedCity = rawCityTokens.length ? title(rawCityTokens.join(' ')) : undefined;
        }
        break;
      }
    }

    if (!resolvedCity && !resolvedCountry) {
      return null;
    }

    return {
      city: resolvedCity,
      country: resolvedCountry,
      score: resolvedScore,
      source: 'dm_text',
    };
  };

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

  if (!parts.length) {
    const colonSegments = phrase
      .split(/:\s*/)
      .map((segment) => cleanSegment(segment.trim()))
      .filter((segment) => segment && !LOCATION_SEGMENT_STOP_RE.test(segment));
    if (colonSegments.length) {
      parts.push(...colonSegments);
    }
  }

  let detectedCountry = nationalityCountry;

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
      const candidateCountry = commaCountry || tryCountry(commaParts[0]) || nationalityCountry;
      const result = finalizeResult(title(commaCity), candidateCountry, 0.65);
      if (result) return result;
    }
    if (commaCountry) detectedCountry = commaCountry;
  }
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
      const result = finalizeResult(match.city, match.country || detectedCountry, match.score ?? 0.7);
      if (result) return result;
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
        const result = finalizeResult(match.city, match.country || maybeCountry, match.score ?? 0.7);
        if (result) return result;
      }
      if (cityCandidate.length >= 3) {
        const result = finalizeResult(title(cityCandidate), maybeCountry, 0.55);
        if (result) return result;
      }
    }
  }

  for (const part of parts) {
    const matchCity = bestCityMatch(part);
    if (matchCity) {
      const result = finalizeResult(matchCity.city, matchCity.country || nationalityCountry, matchCity.score ?? 0.7);
      if (result) return result;
    }
  }

  const match = bestCityMatch(phrase);
  if (match) {
    const result = finalizeResult(match.city, match.country || detectedCountry, match.score ?? 0.7);
    if (result) return result;
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
      const result = finalizeResult(title(fallbackSegment), detectedCountry, 0.5);
      if (result) return result;
    }
  }

  const rough = phrase
    .split(' ')
    .filter((w) => !STOPWORDS.has(strip(w)))
    .slice(0, 3)
    .join(' ')
    .trim();
  if (rough.length >= 3) {
    const result = finalizeResult(title(rough), detectedCountry, 0.5);
    if (result) return result;
  }

  if (detectedCountry) {
    const result = finalizeResult(undefined, detectedCountry, 0.4);
    if (result) return result;
  }

  return null;
}
