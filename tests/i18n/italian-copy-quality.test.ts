import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const english = JSON.parse(readFileSync('src/messages/en.json', 'utf8'));
const historical = JSON.parse(readFileSync('src/messages/it.json', 'utf8'));

describe('Italian English-only compatibility bundle', () => {
  it('matches the canonical English message bundle exactly', () => {
    expect(historical).toEqual(english);
  });
});
