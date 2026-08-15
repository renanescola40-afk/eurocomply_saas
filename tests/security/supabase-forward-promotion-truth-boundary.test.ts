import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const truth = readFileSync('docs/security/evidence/README_SUPABASE_FORWARD_PROMOTION.md', 'utf8');

describe('Supabase forward promotion truth boundary', () => {
  it('does not treat merged executor code as production execution evidence', () => {
    expect(truth).toContain('It is not runtime evidence and it does not authorize production execution.');
    expect(truth).toContain('Merging this change does not mean the selected migrations were applied');
    expect(truth).toContain('Only a successful protected Stage 3 run');
  });

  it('keeps GitHub environment hardening and pooler rotation outside application code', () => {
    expect(truth).toContain('administrator bypass disabled');
    expect(truth).toContain('at least one required deployment reviewer');
    expect(truth).toContain('protected-branches-only deployment policy');
    expect(truth).toContain('provider-side rotation');
  });
});
