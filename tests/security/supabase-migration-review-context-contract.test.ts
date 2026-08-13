import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-migration-review-context.yml', 'utf8');
const builder = readFileSync('scripts/supabase/build-migration-review-context.mjs', 'utf8');

describe('Supabase migration review context boundary', () => {
  it('remains metadata-only and non-crediting', () => {
    expect(workflow).toContain('permissions:\n  actions: read\n  contents: read');
    expect(workflow).toContain('Catalog matches are reviewer aids only');
    expect(workflow).not.toContain('supabase db push');
    expect(workflow).not.toContain('supabase migration repair');
    expect(builder).toContain('acceptedDecisions: 0');
    expect(builder).toContain('productionWriteAuthorized: false');
    expect(builder).toContain('productionWritePerformed: false');
    expect(builder).not.toContain('recommendation:');
  });
});
