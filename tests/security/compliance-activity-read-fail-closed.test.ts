import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/compliance-activity.ts', import.meta.url);

function sliceFunction(source: string, start: string, end?: string) {
  const startIndex = source.indexOf(start);
  const endIndex = end ? source.indexOf(end) : source.length;

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('compliance activity read failure contract', () => {
  it('requires the admin client for authenticated organization reads', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).not.toContain('tryCreateAdminClient');
    expect(source.match(/const supabase = createAdminClient\(\);/g)).toHaveLength(2);
  });

  it('does not represent audit infrastructure failures as an empty audit trail', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const auditRead = sliceFunction(
      source,
      'export async function listAuditEventsForUser',
      'export async function listNotificationsForUser',
    );

    expect(auditRead).toContain("console.warn('[audit] list_failed'");
    expect(auditRead).toContain("throw new Error('Unable to load audit activity.');");
    expect(auditRead).not.toContain('throw error;');
    expect(auditRead).toContain(".eq('organization_id', organization.id)");
    expect(auditRead).toContain(".order('created_at', { ascending: false })");
  });

  it('does not represent notification infrastructure failures as an empty inbox', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const notificationRead = sliceFunction(source, 'export async function listNotificationsForUser');

    expect(notificationRead).toContain("console.warn('[notifications] list_failed'");
    expect(notificationRead).toContain("throw new Error('Unable to load notifications.');");
    expect(notificationRead).not.toContain('throw error;');
    expect(notificationRead).toContain(".eq('organization_id', organization.id)");
    expect(notificationRead).toContain(".order('created_at', { ascending: false })");
  });

  it('preserves genuine empty states only after successful reads', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source.match(/if \(!data\?\.length\) \{\n    return \[\];\n  \}/g)).toHaveLength(2);
  });
});
