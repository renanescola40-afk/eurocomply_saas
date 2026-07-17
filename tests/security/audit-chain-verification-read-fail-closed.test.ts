import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const READER_FILE = 'src/server/queries/audit-chain-events.ts';
const ROUTE_FILE = 'src/app/api/audit/chain/verify/route.ts';
const reader = readFileSync(READER_FILE, 'utf8');
const route = readFileSync(ROUTE_FILE, 'utf8');

describe('audit-chain verification reads fail closed', () => {
  it('requires the privileged client instead of converting missing configuration to an empty chain', () => {
    expect(reader).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(reader).toContain('const supabase = createAdminClient();');
    expect(reader).not.toContain('tryCreateAdminClient');
  });

  it('throws a stable error on canonical and legacy read failures', () => {
    expect(reader).toContain("throw new Error('audit_chain_events_unavailable');");
    expect(reader).not.toContain('if (isMissingAuditEventsTable(error)) return [];');
    expect(reader).toContain("console.warn('[audit] chain_verification_read_failed'");
    expect(reader).toContain("console.warn('[audit] chain_verification_legacy_read_failed'");
  });

  it('preserves a legitimate successful zero-row result', () => {
    expect(reader).toContain('if (!error) return data ?? [];');
    expect(reader).toContain('if (!legacyError) {');
  });

  it('routes chain verification through the strict reader', () => {
    expect(route).toContain("import { listAuditChainEventsForVerification } from '@/server/queries/audit-chain-events';");
    expect(route).toContain('await listAuditChainEventsForVerification(organization.id, parsedLimit.limit + 1)');
    expect(route).not.toContain('listAuditEvents(organization.id');
  });
});
