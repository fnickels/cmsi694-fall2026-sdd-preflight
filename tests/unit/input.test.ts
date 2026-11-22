import { describe, expect, it } from 'vitest';
import { isUsZip, validateQuery, MAX_QUERY_LENGTH } from '../../src/shared/input.js';

describe('validateQuery', () => {
  it('rejects whitespace-only input as EMPTY_INPUT', () => {
    expect(validateQuery('   ')).toEqual({ ok: false, code: 'EMPTY_INPUT' });
    expect(validateQuery('')).toEqual({ ok: false, code: 'EMPTY_INPUT' });
  });

  it('rejects input longer than 100 characters after trimming', () => {
    expect(validateQuery('a'.repeat(101))).toEqual({ ok: false, code: 'INPUT_TOO_LONG' });
  });

  it('accepts exactly 100 characters', () => {
    expect(MAX_QUERY_LENGTH).toBe(100);
    expect(validateQuery('a'.repeat(100))).toEqual({ ok: true, value: 'a'.repeat(100) });
  });

  it('returns the trimmed value', () => {
    expect(validateQuery('  Los Angeles  ')).toEqual({ ok: true, value: 'Los Angeles' });
    expect(validateQuery(`  ${'b'.repeat(100)}  `)).toEqual({ ok: true, value: 'b'.repeat(100) });
  });
});

describe('isUsZip', () => {
  it.each([
    ['90210', true],
    ['9021', false],
    ['902101', false],
    [' 90210 ', true],
    ['SW1A 1AA', false],
    ['9021a', false],
  ])('%j → %s', (input, expected) => {
    expect(isUsZip(input)).toBe(expected);
  });
});
