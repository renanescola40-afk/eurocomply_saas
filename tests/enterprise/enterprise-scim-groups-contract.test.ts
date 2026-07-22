import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260722103000_enterprise_scim_groups.sql', 'utf8');
const collection = readFileSync('src/app/api/scim/v2/Groups/route.ts', 'utf8');
const resource = readFileSync('src/app/api/scim/v2/Groups/[id]/route.ts', 'utf8');
const service = readFileSync('src/server/enterprise/scim-groups.ts', 'utf8');
const routeInventory = readFileSync('docs/security/API_ROUTE_INVENTORY.md', 'utf8');

describe('enterprise SCIM Groups', () => {
  it('persists groups and members with forced RLS and tenant ownership', () => {
    expect(migration).toContain('create table if not exists public.enterprise_scim_groups');
    expect(migration).toContain('create table if not exists public.enterprise_scim_group_members');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('i.organization_id = p_organization_id');
    expect(migration).toContain("raise exception 'scim_group_member_out_of_scope'");
  });

  it('authenticates, rate limits and bounds mutable group requests', () => {
    for (const source of [collection, resource]) {
      expect(source).toContain('authenticateScimRequest');
      expect(source).toContain('checkDistributedRateLimit');
      expect(source).toContain('noStoreJson');
    }
    expect(collection).toContain('readBoundedJsonRequest');
    expect(resource).toContain('readBoundedJsonRequest');
    expect(collection).toContain('MAX_GROUP_BODY_BYTES');
  });

  it('does not trust organization IDs from SCIM payloads', () => {
    expect(service).toContain('input.authentication.organizationId');
    expect(collection).not.toContain('organizationId: parsed');
    expect(resource).not.toContain('organizationId: parsed');
  });

  it('supports collection and resource lifecycle operations', () => {
    expect(collection).toContain('export async function GET');
    expect(collection).toContain('export async function POST');
    expect(resource).toContain('export async function GET');
    expect(resource).toContain('export async function PUT');
    expect(resource).toContain('export async function DELETE');
  });

  it('classifies both SCIM Groups routes as tenant-bound integrations', () => {
    expect(routeInventory).toContain('| `src/app/api/scim/v2/Groups/route.ts` | integration |');
    expect(routeInventory).toContain('| `src/app/api/scim/v2/Groups/[id]/route.ts` | integration |');
  });
});
