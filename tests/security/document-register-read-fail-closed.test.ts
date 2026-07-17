import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/queries/documents.ts', 'utf8');

describe('document register read integrity', () => {
  it('requires the privileged client instead of treating missing configuration as an empty register', () => {
    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).not.toContain('tryCreateAdminClient');
    expect(source).not.toMatch(/if\s*\(\s*!supabase\s*\)\s*return\s*\[\]/);
  });

  it('fails closed when the document query returns an error', () => {
    expect(source).toContain("console.warn('[documents] list_failed', { code: error.code ?? 'unknown' });");
    expect(source).toContain("throw new Error('documents_register_unavailable');");
    expect(source).not.toMatch(/if\s*\(error\)[\s\S]{0,200}return\s*\[\]/);
  });

  it('preserves tenant scoping, deterministic ordering, and pagination', () => {
    expect(source).toContain(".eq('organization_id', organizationId)");
    expect(source).toContain(".order('created_at', { ascending: false })");
    expect(source).toContain('.range(from, to)');
  });
});
