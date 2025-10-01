import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function resolveMlGroups(): string[] {
  const blobs: Array<string> = [];

  for (const key of ['MAILERLITE_GROUP_IDS', 'MAILERLITE_GROUP_ID', 'MAILERLITE_ALLOWED_GROUP_ID'] as const) {
    const value = process.env[key];
    if (value) blobs.push(String(value));
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const legacy = require('../integrations/ml-constants.js');
    const legacyValues = [legacy?.DEFAULT_GROUP_IDS, legacy?.TRIGGER_GROUP_IDS].filter(Boolean);
    for (const entry of legacyValues) {
      blobs.push(Array.isArray(entry) ? entry.join(',') : String(entry));
    }
  } catch (_) {
    // optional legacy constants missing; ignore
  }

  const out = new Set<string>();
  for (const raw of blobs) {
    for (const token of String(raw).split(/[\s,]+/)) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      if (/^\d{5,}$/.test(trimmed)) {
        out.add(trimmed);
      }
    }
  }

  return Array.from(out);
}
