import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const ASSIGNEES_FILE = new URL('../../src/server/ai-governance/fria-assignees.ts', import.meta.url);
const FRIA_ROUTE_FILE = new URL('../../src/app/api/ai-governance/fria/route.ts', import.meta.url);

describe('FRIA active assignee boundary', () => {
  it('lists only active organization members as FRIA assignee candidates when membership status exists', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');
    const candidateRead = source.slice(
      source.indexOf('async function listAssignableMembershipRows'),
      source.indexOf('async function loadAssignedMembershipRows'),
    );

    expect(candidateRead).toContain(".eq('organization_id', organizationId)");
    expect(candidateRead).toContain(".eq('status', 'active')");
    expect(candidateRead.indexOf(".eq('status', 'active')")).toBeGreaterThan(
      candidateRead.indexOf(".eq('organization_id', organizationId)"),
    );
    expect(candidateRead.indexOf(".eq('status', 'active')")).toBeLessThan(
      candidateRead.indexOf(".not('user_id', 'is', null)"),
    );
  });

  it('rejects suspended or inactive members during FRIA assignment validation when membership status exists', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');
    const validationRead = source.slice(
      source.indexOf('async function loadAssignedMembershipRows'),
      source.indexOf('export async function listFriaAssigneeCandidates'),
    );

    expect(validationRead).toContain(".eq('organization_id', organizationId)");
    expect(validationRead).toContain(".eq('status', 'active')");
    expect(validationRead).toContain(".in('user_id', assignedIds)");
    expect(validationRead.indexOf(".eq('status', 'active')")).toBeGreaterThan(
      validationRead.indexOf(".eq('organization_id', organizationId)"),
    );
    expect(validationRead.indexOf(".eq('status', 'active')")).toBeLessThan(
      validationRead.indexOf(".in('user_id', assignedIds)"),
    );
  });

  it('allows the pre-V22 status-less compatibility query only after Postgres proves status is absent', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');

    expect(source).toContain('function isMissingMembershipStatusColumn(error: QueryError)');
    expect(source).toContain("error?.code === '42703'");
    expect(source).toContain("error?.code === 'PGRST204'");
    expect(source).toContain('async function proveMembershipStatusColumnAbsent(');
    expect(source).toContain("supabase.rpc('live_rls_validation_has_column'");
    expect(source).toContain("table_name: 'organization_members'");
    expect(source).toContain("column_name: 'status'");
    expect(source).toContain('statusCapability.error || statusCapability.data !== false');
    expect(source).toContain("membership_status_capability_probe_failed_closed");
    expect(source.match(/if \(error && isMissingMembershipStatusColumn\(error\)\)/g)).toHaveLength(2);
    expect(source.match(/await proveMembershipStatusColumnAbsent\(supabase\);/g)).toHaveLength(2);
    expect(source.match(/\.eq\('status', 'active'\)/g)).toHaveLength(2);
  });

  it('proves schema capability before either legacy status-less membership query', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');
    const candidateRead = source.slice(
      source.indexOf('async function listAssignableMembershipRows'),
      source.indexOf('async function loadAssignedMembershipRows'),
    );
    const validationRead = source.slice(
      source.indexOf('async function loadAssignedMembershipRows'),
      source.indexOf('export async function listFriaAssigneeCandidates'),
    );

    for (const read of [candidateRead, validationRead]) {
      const missingStatusGuard = read.indexOf('if (error && isMissingMembershipStatusColumn(error))');
      const capabilityProof = read.indexOf('await proveMembershipStatusColumnAbsent(supabase);');
      const legacyQuery = read.indexOf(".select('user_id,role')", capabilityProof + 1);
      expect(missingStatusGuard).toBeGreaterThan(-1);
      expect(capabilityProof).toBeGreaterThan(missingStatusGuard);
      expect(legacyQuery).toBeGreaterThan(capabilityProof);
    }
  });

  it('keeps candidate and validation callers bound to the status-aware compatibility helpers', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');
    expect(source).toContain('const memberships = await listAssignableMembershipRows(input.organizationId);');
    expect(source).toContain('const memberships = await loadAssignedMembershipRows(input.organizationId, assignedIds);');
    expect(source).toContain("return { ok: false, error: 'fria_assignee_not_eligible', field };");
  });

  it('keeps the API mutation path bound to server-side assignment validation', async () => {
    const route = await readFile(FRIA_ROUTE_FILE, 'utf8');
    expect(route).toContain('const assignmentValidation = await validateFriaAssignmentMembers({');
    expect(route).toContain("assignmentValidation.error === 'fria_assignee_not_eligible'");
  });
});
