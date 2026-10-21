import { randomInt, randomUUID } from 'node:crypto';
import type { PulseExecutor } from '../../../core';

/**
 * Generate Random ID — a unique id made on the spot, the way n8n's Crypto "Generate" does: no
 * table, no counter, nothing to set up. A running number (INV-0001, INV-0002…) is not this
 * step's job: the record's own id already is one (`INV-{{record.id}}` in Map Fields).
 *
 * Random parts come from the OS's cryptographic generator. The short-code alphabet leaves out
 * 0/O, 1/I/L, so a code read aloud or retyped is not mistaken.
 */
export const SHORT_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const pick = (alphabet: string, n: number) => Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join('');

const clampLength = (v: unknown, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(32, Math.max(4, n)) : fallback;
};

const two = (n: number) => String(n).padStart(2, '0');

export function makeId(format: string, length: number, now = new Date()): string {
  switch (format) {
    case 'uuid':
      return randomUUID();
    case 'number':
      // First digit never 0, so the number keeps its length when read as a number.
      return String(1 + randomInt(9)) + pick('0123456789', length - 1);
    case 'timestamp': {
      const stamp =
        now.getUTCFullYear() + two(now.getUTCMonth() + 1) + two(now.getUTCDate()) + '-' +
        two(now.getUTCHours()) + two(now.getUTCMinutes()) + two(now.getUTCSeconds());
      return stamp + '-' + pick(SHORT_ALPHABET, Math.min(length, 8));
    }
    case 'short':
    default:
      return pick(SHORT_ALPHABET, length);
  }
}

export const execute: PulseExecutor = async (inputs) => {
  const as = String(inputs.as ?? 'id').trim() || 'id';
  const format = String(inputs.format ?? 'short');
  const length = clampLength(inputs.length, format === 'timestamp' ? 4 : 8);
  const prefix = String(inputs.prefix ?? '');
  return { outputs: { [as]: prefix + makeId(format, length) } };
};
