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

  it('handles conversational first-name replies', () => {
    const parsed = parseFullName('Hola 😊 me llamo Camila');
    expect(parsed).toEqual({
      hasSurname: false,
      firstName: 'Camila',
      lastName: '',
      normalized: 'Camila',
    });
  });

  it('handles conversational full-name replies', () => {
    const parsed = parseFullName('Hola, mi nombre es Camila López');
    expect(parsed).toEqual({
      hasSurname: true,
      firstName: 'Camila',
      lastName: 'López',
      normalized: 'Camila López',
    });
  });

  it('rejects conversational non-name phrases', () => {
    const parsed = parseFullName('hola no quiero decirlo');
    expect(parsed).toEqual({
      hasSurname: false,
      firstName: '',
      lastName: '',
      normalized: '',
    });
  });

  it('rejects refusal/placeholder style replies', () => {
    const parsed = parseFullName('prefiero no compartir');
    expect(parsed).toEqual({
      hasSurname: false,
      firstName: '',
      lastName: '',
      normalized: '',
    });
  });
});
