import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260724103000_enterprise_group_access_reconciliation_queue.sql',
  'utf8',
);
const worker = readFileSync(
  'src/server/enterprise/group-access-reconciliation-queue.ts',
  'utf8',
);
const route = readFileSync(
  'src/app/api/internal/enterprise-group-access-reconciliation/route.ts',
  'utf8',
);

describe('enterprise group access reconciliation queue', () => {
  it('uses leased skip-locked claims with bounded retry and dead-letter state', () => {
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain("status in ('pending','processing','retry','completed','dead_letter')");
    expect(migration).toContain("now() + interval '10 minutes'");
    expect(migration).toContain("then 'dead_letter' else 'retry'");
    expect(migration).toContain('attempts <= 8');
    expect(migration).toContain('max_attempts between 1 and 8');
  });

  it('keeps queue storage service-role only and tenant scoped', () => {
    expect(migration).toContain('organization_id uuid not null references public.organizations(id)');
    expect(migration).toContain('force row level security');
    expect(migration).toContain(
      'revoke all on public.enterprise_group_access_reconciliation_jobs from public, anon, authenticated',
    );
    expect(migration).toContain('grant all on public.enterprise_group_access_reconciliation_jobs to service_role');
  });

  it('records only bounded sanitized error codes', () => {
    expect(migration).toContain("left(coalesce(nullif(trim(p_error_code), ''), 'unknown_error'), 120)");
    expect(worker).toContain("error.message.slice(0, 120)");
    expect(worker).not.toContain('error.stack');
  });

  it('derives the audit actor from trusted server configuration', () => {
    expect(route).toContain('process.env.ENTERPRISE_RECONCILIATION_ACTOR_USER_ID');
    expect(route).not.toContain('actorUserId: z.string().uuid()');
    expect(route).not.toContain('input.actorUserId');
    expect(route).toContain('isAuthorizedInternalCronRequest(request)');
    expect(route).toContain('enforceInternalAuthenticationRateLimit');
  });

  it('bounds batches and validates lease identity', () => {
    expect(migration).toContain('batch_size integer not null default 100 check (batch_size between 1 and 500)');
    expect(worker).toContain('Math.min(Math.max(input.batchSize ?? 100, 1), 500)');
    expect(migration).toContain('and lease_token = p_lease_token');
    expect(worker).toContain("uuidSchema.parse(job.lease_token)");
  });
});
