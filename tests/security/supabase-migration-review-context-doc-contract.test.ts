import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('docs/security/evidence/supabase-migration-review-context.md', 'utf8');

describe('migration review context evidence boundary', () => {
  it('does not credit catalog-name matches as migration decisions', () => {
    expect(doc).toContain('A catalog-name match is not statement-level schema equivalence');
    expect(doc).toContain('Every migration classification remains human-governed');
    expect(doc).toContain('acceptedDecisions: 0');
    expect(doc).toContain('productionWritePerformed: false');
  });
});
