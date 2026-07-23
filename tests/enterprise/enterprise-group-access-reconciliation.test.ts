import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260724001000_enterprise_group_access_reconciliation.sql',
  'utf8',
);
const service = readFileSync(
  'src/server/enterprise/group-access-reconciliation.ts',
  'utf8',
);
const route = readFileSync(
  'src/app/api/internal/enterprise-group-access-reconciliation/route.ts',
  'utf8',
);

describe('enterprise group access reconciliation', () => {
  it('keeps department assignments tenant scoped and service-role only', () => {
    expect(migration).toContain('primary key (organization_id, membership_id)');
    expect(migration).toContain('force row level security');
    expect(migration).toContain(
      'revoke all on public.enterprise_member_department_assignments from public, anon, authenticated',
    );
    expect(migration).toContain(
      'foreign key (organization_id, source_group_id)',
    );
  });

  it('resolves only active identities and changed access', () => {
    expect(migration).toContain('i.organization_id = p_organization_id');
    expect(migration).toContain('i.active = true');
    expect(migration).toContain("resolved.outcome = 'resolved'");
    expect(migration).toContain('i.role is distinct from resolved.role');
    expect(migration).toContain('i.seat_type is distinct from resolved.seat_type');
  });

  it('applies role and seat changes through the central seat ledger', () => {
    expect(service).toContain('provisionEnterpriseIdentity({');
    expect(service).toContain("source: 'scim'");
    expect(service).toContain('resolved_role');
    expect(service).toContain('resolved_seat_type');
    expect(service).not.toContain(".from('organization_members').update");
  });

  it('uses stable idempotency and bounded batches', () => {
    expect(service).toContain("createHash('sha256')");
    expect(service).toContain('Math.min(Math.max(input.batchSize ?? 100, 1), 500)');
    expect(migration).toContain('limit least(greatest(coalesce(p_limit, 100), 1), 500)');
  });

  it('protects the internal route and bounds its JSON body', () => {
    expect(route).toContain('enforceInternalAuthenticationRateLimit');
    expect(route).toContain('isAuthorizedInternalCronRequest(request)');
    expect(route).toContain('readBoundedJsonRequest(request');
    expect(route).toContain('maxBytes: MAX_BODY_BYTES');
    expect(route).toContain("organizationId: z.string().uuid()");
    expect(route).toContain("actorUserId: z.string().uuid()");
    expect(route).not.toContain('request.json()');
  });
});
