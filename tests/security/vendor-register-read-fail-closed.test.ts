import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/vendors.ts', import.meta.url);

describe('vendor register read failure contract', () => {
  it('uses the required admin client for vendor reads', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).toContain('const supabase = createAdminClient();');
    expect(source).not.toContain('tryCreateAdminClient');
  });

  it('does not convert vendor database failures into an empty register', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("console.warn('[vendors] list_failed'");
    expect(source).toContain('throw error;');
    expect(source).not.toContain('if (!supabase) return [];');
    expect(source).not.toMatch(/if \(error\)[\s\S]*?return \[\];/);
  });

  it('preserves tenant scoping and deterministic ordering', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain(".eq('organization_id', organizationId)");
    expect(source).toContain(".order('created_at', { ascending: false })");
  });
});
