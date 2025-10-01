import { describe, expect, test } from 'vitest';
import { bestName, stripEmoji, titleCaseName } from '../lib/names.js';

describe('names helpers', () => {
  test('stripEmoji removes pictographs', () => {
    expect(stripEmoji('Hola 👋 Mundo')).toBe('Hola  Mundo');
  });

  test('titleCaseName keeps connectors lowercase', () => {
    expect(titleCaseName('juan de la cruz')).toBe('Juan de la Cruz');
  });

  test('bestName prioritises full name', () => {
    const chosen = bestName({
      fullName: 'ana sofia',
      username: 'ana_sofi',
      email: 'ana@example.com',
    });
    expect(chosen).toEqual({ name: 'Ana Sofia', source: 'instagram_full_name' });
  });
});
