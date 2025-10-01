import { describe, expect, test } from 'vitest';
import { resolveMlGroups } from '../lib/config/ml-groups.js';

describe('ml groups config', () => {
  test('ML groups stay as string tokens', () => {
    const original = process.env.MAILERLITE_GROUP_IDS;
    process.env.MAILERLITE_GROUP_IDS = '153400728188094209,154049618670257330';
    try {
      const groups = resolveMlGroups();
      expect(groups).toEqual(['153400728188094209', '154049618670257330']);
      groups.forEach((id) => {
        expect(/^\d{5,}$/.test(id)).toBe(true);
      });
    } finally {
      if (original === undefined) {
        delete process.env.MAILERLITE_GROUP_IDS;
      } else {
        process.env.MAILERLITE_GROUP_IDS = original;
      }
    }
  });
});
