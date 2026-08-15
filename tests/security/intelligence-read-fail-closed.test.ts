import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/intelligence.ts', import.meta.url);
const REFRESH_FILE = new URL('../../src/app/api/intelligence/refresh/route.ts', import.meta.url);

describe('Intelligence read failure contract', () => {
  it('requires the privileged backend client instead of falling back on missing configuration', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).not.toContain('tryCreateAdminClient');
  });

  it('does not convert provider read errors or empty results into published fallback content', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const listRead = source.slice(
      source.indexOf('export async function listPublishedIntelligenceItems'),
      source.indexOf('export async function getPublishedIntelligenceItem'),
    );
    const detailRead = source.slice(source.indexOf('export async function getPublishedIntelligenceItem'));

    expect(listRead).toContain("if (error) throw intelligenceReadError('list_published', error.code);");
    expect(listRead).toContain('if (!data?.length) return [];');
    expect(source).not.toContain('fallbackIntelligenceItems');
    expect(detailRead).toContain("if (externalError) throw intelligenceReadError('get_published_external_id', externalError.code);");
    expect(detailRead).toContain("if (uuidError) throw intelligenceReadError('get_published_uuid', uuidError.code);");
    expect(detailRead).toContain('if (!isUuid(id)) return null;');
  });

  it('requires a real publication date and an HTTPS reference URL before customer display', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain(".not('published_at', 'is', null)");
    expect(source).toContain(".not('reference_url', 'is', null)");
    expect(source).toContain("parsed.protocol === 'https:'");
    expect(source).toContain('if (!item.published_at || !sourceUrl) return null;');
    expect(source).not.toContain('publishedAt: item.published_at ?? new Date().toISOString()');
    expect(source).toContain('reference_url');
    expect(source).toContain('sourceUrl');
  });

  it('keeps internal refresh probes out of the published intelligence feed', async () => {
    const source = await readFile(REFRESH_FILE, 'utf8');

    expect(source).toContain('published_at: null');
    expect(source).toContain('reference_url: null');
    expect(source).toContain("status: 'draft'");
    expect(source).not.toContain('published_at: new Date().toISOString()');
  });

  it('continues to fail closed on provider read errors', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    expect(source).toContain("return new Error('intelligence_content_unavailable');");
  });
});
