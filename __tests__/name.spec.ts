import { describe, expect, test } from 'vitest';
import { deriveName, isBadName, stripPlaceholderArtifacts } from '../lib/utils/name.js';

describe('name utils', () => {
  test('stripPlaceholderArtifacts rescues plain value', () => {
    expect(stripPlaceholderArtifacts('Rafarontiveros Name}}')).toBe('Rafarontiveros');
  });

  test('placeholder fragments are flagged', () => {
    ['Rafarontiveros Name}}', '{{name}}', '{name}', '%7B%7Bname%7D%7D', '[Name]', '<name>'].forEach((token) => {
      expect(isBadName(token)).toBe(true);
    });
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
