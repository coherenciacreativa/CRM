import { describe, expect, it } from 'vitest';
import { parseFullName } from '../lib/names/parseFullName';

describe('parseFullName', () => {
  it('detects first and last name', () => {
    const parsed = parseFullName('Eliana Cadavid');
    expect(parsed).toEqual({
      hasSurname: true,
      firstName: 'Eliana',
      lastName: 'Cadavid',
      normalized: 'Eliana Cadavid',
    });
  });

  it('keeps single given names without surname', () => {
    const parsed = parseFullName('María José');
    expect(parsed.hasSurname).toBe(false);
    expect(parsed.firstName).toBe('María José');
    expect(parsed.lastName).toBe('');
  });

  it('supports compound last names with connectors', () => {
    const parsed = parseFullName('Juan de la Cruz');
    expect(parsed).toEqual({
      hasSurname: true,
      firstName: 'Juan',
      lastName: 'de la Cruz',
      normalized: 'Juan de la Cruz',
    });
  });
});
