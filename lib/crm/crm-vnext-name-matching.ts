const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'con', 'para', 'y']);

const TOKEN_ALIASES: Record<string, string[]> = {
  bedud: ['bedout', 'bedouth'],
  bedut: ['bedout', 'bedouth'],
  bedout: ['bedud', 'bedut', 'bedouth'],
  bedouth: ['bedud', 'bedut', 'bedout'],
};

const COMMON_MIDDLE_NAME_TOKENS = new Set(['maria', 'jose', 'jesus']);

export const normalizeCrmVNextIdentityText = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const crmVNextNameTokens = (value: string | null | undefined): string[] =>
  normalizeCrmVNextIdentityText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !STOPWORDS.has(token));

export const crmVNextExpandNameToken = (token: string | null | undefined): string[] => {
  const normalized = normalizeCrmVNextIdentityText(token);
  if (!normalized) return [];
  return Array.from(new Set([normalized, ...(TOKEN_ALIASES[normalized] ?? [])]));
};

export const crmVNextIdentityTextTokens = (value: string | null | undefined): string[] =>
  normalizeCrmVNextIdentityText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

export const crmVNextNameTokenCompatible = (
  expectedToken: string | null | undefined,
  candidateToken: string | null | undefined,
): boolean => {
  const expected = normalizeCrmVNextIdentityText(expectedToken);
  const candidate = normalizeCrmVNextIdentityText(candidateToken);
  if (!expected || !candidate) return false;
  if (expected === candidate) return true;
  return crmVNextExpandNameToken(expected).includes(candidate)
    || crmVNextExpandNameToken(candidate).includes(expected);
};

export const crmVNextNameTokenInText = (
  token: string | null | undefined,
  text: string | null | undefined,
): boolean => {
  const textTokens = crmVNextIdentityTextTokens(text);
  return crmVNextExpandNameToken(token).some((variant) =>
    textTokens.some((textToken) => crmVNextNameTokenCompatible(variant, textToken)),
  );
};

export const crmVNextMatchedNameTokens = (
  tokens: string[],
  haystack: string | null | undefined,
): string[] => tokens.filter((token) => crmVNextNameTokenInText(token, haystack));

const crmVNextSurnameTokens = (tokens: string[]): string[] => {
  if (tokens.length < 3) return tokens.slice(1);
  const surnames = tokens.slice(1).filter((token) => !COMMON_MIDDLE_NAME_TOKENS.has(token));
  return surnames.length ? surnames : tokens.slice(1);
};

export const crmVNextNameCompatible = (
  rawName: string | null | undefined,
  candidateText: string | null | undefined,
): boolean => {
  const rawTokens = crmVNextNameTokens(rawName);
  if (!rawTokens.length || !candidateText) return true;

  const normalizedRaw = normalizeCrmVNextIdentityText(rawName);
  const normalizedCandidate = normalizeCrmVNextIdentityText(candidateText);
  if (normalizedRaw && normalizedCandidate.includes(normalizedRaw)) return true;
  if (rawTokens.length === 1) return crmVNextNameTokenInText(rawTokens[0], candidateText);
  if (rawTokens.every((token) => crmVNextNameTokenInText(token, candidateText))) return true;
  if (rawTokens.length >= 3 && crmVNextNameTokenInText(rawTokens[0], candidateText)) {
    return crmVNextSurnameTokens(rawTokens).some((token) => crmVNextNameTokenInText(token, candidateText));
  }
  return false;
};
