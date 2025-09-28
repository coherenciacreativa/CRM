import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const CANDIDATE_MODULES = ['../integrations/ml-constants.js', '../integrations/mailerlite.js'];

const collectTokens = (value: unknown, bucket: Set<string>) => {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectTokens(entry, bucket);
    }
    return;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    bucket.add(String(value));
    return;
  }
  if (typeof value === 'string') {
    const matches = value.match(/\d+/g);
    if (matches) {
      for (const match of matches) {
        if (match) bucket.add(match);
      }
    }
  } else if (typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectTokens(entry, bucket);
    }
  }
};

/**
 * Devuelve los IDs de grupos de MailerLite a los que SIEMPRE agregamos a cada suscriptor nuevo.
 * Tolerante con envs legacy y con posibles constantes ya existentes en el repo.
 */
export function resolveMlGroups(): string[] {
  const uniqueIds = new Set<string>();

  const envCandidates = [
    process.env.MAILERLITE_GROUP_IDS,
    process.env.MAILERLITE_GROUP_ID,
    process.env.MAILERLITE_ALLOWED_GROUP_ID,
    process.env.ML_GROUPS,
  ];

  for (const candidate of envCandidates) {
    collectTokens(candidate, uniqueIds);
  }

  for (const modPath of CANDIDATE_MODULES) {
    try {
      const legacy = require(modPath);
      collectTokens(legacy, uniqueIds);
    } catch (error) {
      // no-op: module not found or invalid shape
    }
  }

  return Array.from(uniqueIds);
}
