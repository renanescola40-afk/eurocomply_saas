import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const path = 'scripts/security/supabase-v20-live-fixtures.mjs';
const source = readFileSync(path, 'utf8');

function stripComments(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('live commercial fixture private-schema boundary', () => {
  it('keeps app_private off the PostgREST client path', () => {
    const executableSource = stripComments(source);

    expect(executableSource).not.toMatch(/\.schema\s*\(\s*['"]app_private['"]\s*\)/);
    expect(source).toMatch(/enterprise_entitlement_sources/);
    expect(source).toMatch(/enterprise_entitlement_snapshots/);
    expect(source).toMatch(/persisted_authority_then_quota_trigger/);
    expect(source).toMatch(/downstream quota-protected fixture writes exercise/);
  });
});
