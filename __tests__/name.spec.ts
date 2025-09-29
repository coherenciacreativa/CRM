import { describe, expect, test } from 'vitest';
import { deriveName, isBadName } from '../lib/utils/name.js';

describe('name utils', () => {
  test('blocks handlebars/double-curly', () => {
    expect(isBadName('{{full Name}} Name}}')).toBe(true);
    expect(isBadName('{{name}}')).toBe(true);
    expect(isBadName('{name}')).toBe(true);
    expect(isBadName('%7B%7Bname%7D%7D')).toBe(true);
  });

  test('accepts clean IG full_name', () => {
    const guess = deriveName({ igProfileName: 'Rafa Reyes Ontiveros' });
    expect(guess.value).toBe('Rafa Reyes Ontiveros');
    expect(isBadName(guess.value)).toBe(false);
  });

  test('email local-part → human name', () => {
    const guess = deriveName({ email: 'rafa.reyes.ontiveros@gmail.com' });
    expect(guess.value).toBe('Rafa Reyes Ontiveros');
    expect(isBadName(guess.value)).toBe(false);
  });
});
