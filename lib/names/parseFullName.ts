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

export function normalizeName(raw: string): string {
  return (raw ?? '')
    .toString()
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{M}\s\-']/gu, '');
}

export function parseFullName(raw: string): ParsedName {
  const cleaned = normalizeName(raw);
  if (!cleaned) {
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
