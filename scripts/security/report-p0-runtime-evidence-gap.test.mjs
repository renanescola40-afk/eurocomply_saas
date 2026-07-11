import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(new URL('./report-p0-runtime-evidence-gap.mjs', import.meta.url), 'utf8');

describe('P0 runtime evidence gap report', () => {
  it('uses the canonical Supabase RLS runtime evidence validator', () => {
    expect(source).toContain("import { validateSupabaseRlsRuntimeEvidence } from '../release/validate-supabase-rls-runtime-evidence.mjs';");
    expect(source).toContain('validator: validateSupabaseRlsRuntimeEvidence');
  });

  it('requires validator success before counting evidence as satisfied', () => {
    expect(source).toContain('validatorFailures.length === 0');
    expect(source).toContain('validatorFailures: evidence.validatorFailures');
  });
});
