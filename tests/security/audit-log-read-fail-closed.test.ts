import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const QUERY_FILE = 'src/server/queries/compliance-activity.ts';
const source = readFileSync(QUERY_FILE, 'utf8');

function sourceBetween(start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex, start).toBeGreaterThanOrEqual(0);
  expect(endIndex, end).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('audit trail reads fail closed', () => {
  const auditLoader = sourceBetween(
    'export async function listAuditEventsForUser',
    'export async function listNotificationsForUser',
  );

  it('never renders fabricated audit evidence', () => {
    expect(source).not.toContain('demoAuditRows');
    expect(auditLoader).not.toContain('demo-audit-');
    expect(auditLoader).toContain('if (!organization)');
    expect(auditLoader).toContain('return [];');
  });

  it('requires the privileged database client for organization-scoped audit reads', () => {
    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(auditLoader).toContain('const supabase = createAdminClient();');
    expect(auditLoader).not.toContain('tryCreateAdminClient');
  });

  it('surfaces database failures instead of presenting an empty audit trail', () => {
    expect(auditLoader).toContain("console.warn('[audit] list_failed', { code: error.code ?? 'unknown' });");
    expect(auditLoader).toContain("throw new Error('Unable to load audit trail.');");
    expect(auditLoader).not.toContain('isExpectedSchemaFallback(error)');
  });

  it('preserves legitimate successful zero-row results', () => {
    expect(auditLoader).toContain('return (data ?? []).map((item) => ({');
  });
});
