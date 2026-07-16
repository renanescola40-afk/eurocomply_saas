import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const codeownersPath = join(process.cwd(), '.github/CODEOWNERS');
const codeowners = readFileSync(codeownersPath, 'utf8');

const requiredOwnershipRules = [
  '* @renanescola40-afk',
  '/.github/ @renanescola40-afk',
  '/src/app/api/ @renanescola40-afk',
  '/src/lib/security/ @renanescola40-afk',
  '/src/server/security/ @renanescola40-afk',
  '/src/lib/auth/ @renanescola40-afk',
  '/src/lib/billing/ @renanescola40-afk',
  '/supabase/ @renanescola40-afk',
  '/scripts/security/ @renanescola40-afk',
  '/scripts/release/ @renanescola40-afk',
  '/docs/security/ @renanescola40-afk',
  '/docs/decisions/ @renanescola40-afk',
];

describe('CODEOWNERS security ownership contract', () => {
  it('defines a default owner and explicit owners for sensitive paths', () => {
    for (const rule of requiredOwnershipRules) {
      expect(codeowners).toContain(rule);
    }
  });

  it('keeps the default rule before the more specific path rules', () => {
    const defaultRuleIndex = codeowners.indexOf('* @renanescola40-afk');
    const apiRuleIndex = codeowners.indexOf('/src/app/api/ @renanescola40-afk');
    const databaseRuleIndex = codeowners.indexOf('/supabase/ @renanescola40-afk');

    expect(defaultRuleIndex).toBeGreaterThanOrEqual(0);
    expect(apiRuleIndex).toBeGreaterThan(defaultRuleIndex);
    expect(databaseRuleIndex).toBeGreaterThan(defaultRuleIndex);
  });

  it('does not use wildcard ownership without an explicit GitHub owner', () => {
    const activeRules = codeowners
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    for (const rule of activeRules) {
      const [, ...owners] = rule.split(/\s+/);
      expect(owners.length).toBeGreaterThan(0);
      expect(owners.every((owner) => owner.startsWith('@'))).toBe(true);
    }
  });
});
