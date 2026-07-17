import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/intelligence.ts', import.meta.url);

describe('Intelligence read failure contract', () => {
  it('requires the privileged backend client instead of falling back on missing configuration', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).not.toContain('tryCreateAdminClient');
  });

  it('does not convert provider read errors into published fallback content', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const listRead = source.slice(
      source.indexOf('export async function listPublishedIntelligenceItems'),
      source.indexOf('export async function getPublishedIntelligenceItem'),
    );
    const detailRead = source.slice(source.indexOf('export async function getPublishedIntelligenceItem'));

    expect(listRead).toContain("if (error) throw intelligenceReadError('list_published', error.code);");
    expect(listRead).not.toContain('if (error || !data?.length) return fallbackIntelligenceItems;');
    expect(detailRead).toContain("if (externalError) throw intelligenceReadError('get_published_external_id', externalError.code);");
    expect(detailRead).toContain("if (uuidError) throw intelligenceReadError('get_published_uuid', uuidError.code);");
    expect(detailRead).not.toContain('if (!externalError && externalMatch)');
  });

  it('keeps fallback editorial content only for successful empty or known static-item lookups', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain('if (!data?.length) return fallbackIntelligenceItems;');
    expect(source).toContain('if (!isUuid(id)) return fallback ?? null;');
    expect(source).toContain("return new Error('intelligence_content_unavailable');");
  });
});
