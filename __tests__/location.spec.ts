import { describe, expect, test } from 'vitest';
import { extractLocationFromText } from '../lib/utils/location.js';

describe('location extractor', () => {
  test('handles city and country from narrative sentence', () => {
    const text =
      'Estoy en Costa Rica, San Carlos, el pueblo se llama San Vicente, muchas gracias claro que sí';
    const result = extractLocationFromText(text);
    expect(result?.country).toBe('Costa Rica');
    expect(result?.city).toBe('San Carlos');
  });
});
