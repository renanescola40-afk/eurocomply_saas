import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/risks.ts', import.meta.url);

describe('risk register read failure contract', () => {
  it('uses the required admin client instead of an optional client', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).toContain('const supabase = createAdminClient();');
    expect(source).not.toContain('tryCreateAdminClient');
  });

  it('does not represent database failures as an empty risk register', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const errorBranch = source.slice(source.indexOf('if (error) {'), source.indexOf('return data ?? [];'));

    expect(errorBranch).toContain("console.warn('[risks] list_failed'");
    expect(errorBranch).toContain('throw error;');
    expect(errorBranch).not.toContain('return [];');
  });

  it('retains an empty array only for a successful zero-row result', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain('return data ?? [];');
  });
});
