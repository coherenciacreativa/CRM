export type LocationGuess = { city?: string; country?: string; score: number; source: 'dm_text' | 'ig' };

type CanonEntry = { city: string; country?: string; synonyms: string[] };

const CANON: Record<string, CanonEntry> = {
  bogota: {
    city: 'Bogotá',
    country: 'Colombia',
    synonyms: ['bogota', 'bogotá', 'bta', 'bogota dc', 'bogotá d.c.', 'santa fe de bogota', 'bogoá'],
  },
  medellin: { city: 'Medellín', country: 'Colombia', synonyms: ['medellin', 'medellín'] },
  cali: { city: 'Cali', country: 'Colombia', synonyms: ['cali', 'santiago de cali'] },
  barranquilla: { city: 'Barranquilla', country: 'Colombia', synonyms: ['barranquilla'] },
  cartagena: { city: 'Cartagena', country: 'Colombia', synonyms: ['cartagena', 'cartagena de indias'] },
  bucaramanga: { city: 'Bucaramanga', country: 'Colombia', synonyms: ['bucaramanga'] },
  cucuta: { city: 'Cúcuta', country: 'Colombia', synonyms: ['cucuta', 'cúcuta'] },
  pereira: { city: 'Pereira', country: 'Colombia', synonyms: ['pereira'] },
  manizales: { city: 'Manizales', country: 'Colombia', synonyms: ['manizales'] },
  armenia: { city: 'Armenia', country: 'Colombia', synonyms: ['armenia'] },
  ibague: { city: 'Ibagué', country: 'Colombia', synonyms: ['ibague', 'ibagué'] },
  neiva: { city: 'Neiva', country: 'Colombia', synonyms: ['neiva'] },
  pasto: { city: 'Pasto', country: 'Colombia', synonyms: ['pasto'] },
  popayan: { city: 'Popayán', country: 'Colombia', synonyms: ['popayan', 'popayán'] },
  monteria: { city: 'Montería', country: 'Colombia', synonyms: ['monteria', 'montería'] },
  villavicencio: { city: 'Villavicencio', country: 'Colombia', synonyms: ['villavicencio'] },
  'santa marta': { city: 'Santa Marta', country: 'Colombia', synonyms: ['santa marta'] },
  tunja: { city: 'Tunja', country: 'Colombia', synonyms: ['tunja'] },
  valledupar: { city: 'Valledupar', country: 'Colombia', synonyms: ['valledupar'] },
  soacha: { city: 'Soacha', country: 'Colombia', synonyms: ['soacha'] },
  envigado: { city: 'Envigado', country: 'Colombia', synonyms: ['envigado'] },
  itagui: { city: 'Itagüí', country: 'Colombia', synonyms: ['itagui', 'itagüí'] },
  subachoque: { city: 'Subachoque', country: 'Colombia', synonyms: ['subachoque'] },
  'la vega': { city: 'La Vega', country: 'Colombia', synonyms: ['la vega'] },
  'buenos aires': { city: 'Buenos Aires', country: 'Argentina', synonyms: ['buenos aires', 'bs as'] },
  lima: { city: 'Lima', country: 'Perú', synonyms: ['lima'] },
  santiago: { city: 'Santiago', country: 'Chile', synonyms: ['santiago', 'santiago de chile'] },
  quito: { city: 'Quito', country: 'Ecuador', synonyms: ['quito'] },
  montevideo: { city: 'Montevideo', country: 'Uruguay', synonyms: ['montevideo'] },
  asuncion: { city: 'Asunción', country: 'Paraguay', synonyms: ['asuncion', 'asunción'] },
  'la paz': { city: 'La Paz', country: 'Bolivia', synonyms: ['la paz'] },
  cdmx: {
    city: 'Ciudad de México',
    country: 'México',
    synonyms: ['cdmx', 'mexico', 'méxico', 'ciudad de mexico', 'ciudad de méxico'],
  },
  panama: { city: 'Panamá', country: 'Panamá', synonyms: ['panama', 'panamá'] },
};

const strip = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const levenshtein = (a: string, b: string): number => {
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
};

const bestMatch = (raw: string) => {
  const query = strip(raw.trim());
  if (!query) return null;
  let best: { canon: CanonEntry; distance: number } | null = null;
  for (const canon of Object.values(CANON)) {
    for (const synonym of canon.synonyms) {
      const distance = levenshtein(query, strip(synonym));
      if (!best || distance < best.distance) {
        best = { canon, distance };
      }
      if (distance === 0) break;
    }
  }
  if (!best) return null;
  const ratio = best.distance / Math.max(3, query.length);
  if (ratio <= 0.3) {
    return {
      city: best.canon.city,
      country: best.canon.country,
      score: Number((0.8 - ratio * 0.5).toFixed(3)),
    };
  }
  return null;
};

export function extractLocationFromText(text?: string): LocationGuess | null {
  if (!text) return null;
  const normalized = ` ${text.replace(/\s+/g, ' ').trim()} `;
  const pattern =
    /\b(?:en|desde|soy de|vivo en|me encuentro en|estoy en|resido en|radico en|de la ciudad de|la ciudad de)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ\.\-\'\s]{2,})/i;
  const match = normalized.match(pattern);
  if (!match) return null;
  let candidate = match[1]?.split(/[.,;]/)[0] ?? '';
  candidate = candidate.replace(/\b(ciudad|de)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!candidate) return null;

  const tokens = candidate.split(' ').slice(0, 3);
  const joined = tokens.join(' ');
  const guess =
    bestMatch(joined) || bestMatch(tokens.slice(0, 2).join(' ')) || bestMatch(tokens[0]);
  if (!guess) return null;
  return { ...guess, source: 'dm_text' };
}
