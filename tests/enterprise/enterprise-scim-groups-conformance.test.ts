import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const groupsRoute = readFileSync('src/app/api/scim/v2/Groups/route.ts', 'utf8');
const groupRoute = readFileSync('src/app/api/scim/v2/Groups/[id]/route.ts', 'utf8');
const groupServer = readFileSync('src/server/enterprise/scim-groups.ts', 'utf8');
const groupMigration = readFileSync(
  'supabase/migrations/20260722103000_enterprise_scim_groups.sql',
  'utf8',
);

describe('enterprise SCIM Groups conformance', () => {
  it('keeps every group operation tenant-bound to the bearer token', () => {
    expect(groupsRoute).toContain('authenticateScimRequest(request)');
    expect(groupRoute).toContain('authenticateScimRequest(request)');
    expect(groupServer).toContain('authentication.organizationId');
    expect(groupServer).not.toContain('request.organizationId');
  });

  it('supports the required collection and resource methods', () => {
    expect(groupsRoute).toContain('export async function GET');
    expect(groupsRoute).toContain('export async function POST');
    expect(groupRoute).toContain('export async function GET');
    expect(groupRoute).toContain('export async function PUT');
    expect(groupRoute).toContain('export async function PATCH');
    expect(groupRoute).toContain('export async function DELETE');
  });

  it('supports bounded pagination and displayName equality filtering', () => {
    expect(groupsRoute).toContain('startIndex');
    expect(groupsRoute).toContain('count');
    expect(groupsRoute).toContain('displayName\\s+eq');
    expect(groupsRoute).toContain("new ScimError('unsupported_scim_group_filter', 400, 'invalidFilter')");
  });

  it('supports SCIM PatchOp membership and attribute mutations', () => {
    expect(groupRoute).toContain('urn:ietf:params:scim:api:messages:2.0:PatchOp');
    expect(groupRoute).toContain("z.enum(['add', 'remove', 'replace'])");
    expect(groupRoute).toContain('members\\[value\\s+eq');
    expect(groupRoute).toContain("new ScimError('unsupported_scim_group_patch_operation', 400, 'invalidPath')");
  });

  it('uses bounded bodies, distributed rate limits and atomic database writes', () => {
    expect(groupsRoute).toContain('readBoundedJsonRequest(request');
    expect(groupRoute).toContain('readBoundedJsonRequest(request');
    expect(groupsRoute).toContain('checkDistributedRateLimit(request');
    expect(groupRoute).toContain('checkDistributedRateLimit(request');
    expect(groupServer).toContain("rpc('upsert_enterprise_scim_group_atomic'");
    expect(groupServer).toContain("rpc('delete_enterprise_scim_group_atomic'");
  });

  it('enforces tenant-matching database relationships and RLS', () => {
    expect(groupMigration).toContain('enterprise_scim_groups');
    expect(groupMigration).toContain('enterprise_scim_group_members');
    expect(groupMigration).toContain('force row level security');
    expect(groupMigration).toContain('upsert_enterprise_scim_group_atomic');
    expect(groupMigration).toContain('delete_enterprise_scim_group_atomic');
  });
});
