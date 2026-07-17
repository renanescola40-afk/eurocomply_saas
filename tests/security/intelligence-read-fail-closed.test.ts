import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/server/queries/intelligence.ts'),
  'utf8',
);

describe('intelligence read integrity', () => {
  it('requires the privileged client instead of optional fallback creation', () => {
    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).not.toContain('tryCreateAdminClient');
  });

  it('does not substitute editorial fallback content for infrastructure failures', () => {
    expect(source).not.toContain('if (!supabase) return fallbackIntelligenceItems');
    expect(source).not.toContain('if (error || !data?.length) return fallbackIntelligenceItems');
    expect(source).toContain("throw new Error('intelligence_feed_unavailable')");
    expect(source).toContain("throw new Error('intelligence_item_unavailable')");
  });

  it('keeps valid empty and not-found states distinct from read failures', () => {
    expect(source).toContain("return (data as IntelligenceDatabaseRow[] | null)?.map((item) => mapDatabaseItem(item)) ?? [];");
    expect(source).toContain('if (!isUuid(id)) return null;');
    expect(source).toContain('return uuidMatch ? mapDatabaseItem(uuidMatch as IntelligenceDatabaseRow) : null;');
  });

  it('logs only stable operation metadata and provider error codes', () => {
    expect(source).toContain("console.error('Intelligence read failed.', { operation, code: code ?? 'unknown' });");
    expect(source).not.toContain('error.message');
  });
});
