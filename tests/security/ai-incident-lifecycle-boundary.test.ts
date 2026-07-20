import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-incidents/[id]/route.ts', 'utf8');
const query = readFileSync('src/server/queries/ai-incident-lifecycle.ts', 'utf8');
const migration = readFileSync(
  'supabase/migrations/20260719224500_ai_incident_lifecycle_atomic.sql',
  'utf8',
);
const inventory = readFileSync('docs/security/API_ROUTE_INVENTORY.md', 'utf8');

describe('AI incident lifecycle enterprise boundary', () => {
  it('registers the resource route and protects lifecycle mutations before data access', () => {
    expect(inventory).toContain('src/app/api/ai-incidents/[id]/route.ts');
    expect(route).toContain('assertTrustedOrigin(request)');
    expect(route).toContain("permission: 'manage_ai_incidents'");
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('parseJsonBodyWithZod(request');
    expect(route).toContain('expectedUpdatedAt');

    const origin = route.indexOf('assertTrustedOrigin(request)');
    const permission = route.indexOf("permission: 'manage_ai_incidents'");
    const limiter = route.indexOf('checkDistributedRateLimit({');
    const parse = route.indexOf('parseJsonBodyWithZod(request');
    const mutation = route.indexOf('updateAiIncidentAtomic(id');
    expect(origin).toBeLessThan(permission);
    expect(permission).toBeLessThan(limiter);
    expect(limiter).toBeLessThan(parse);
    expect(parse).toBeLessThan(mutation);
  });

  it('keeps reads and mutations tenant-bound and returns no-store responses', () => {
    expect(route).toContain('getAiIncidentWithHistory(id, organization.id)');
    expect(route).toContain('organizationId: organization.id');
    expect(route).toContain('actorUserId: user.id');
    expect(route).toContain('noStoreJson');
    expect(query).toContain(".eq('organization_id', organizationId)");
    expect(query).toContain(".eq('incident_id', incidentId)");
  });

  it('persists the incident update, immutable history and chained audit in one RPC', () => {
    expect(query).toContain("const TRANSITION_RPC = 'transition_ai_incident_atomic'");
    expect(query).toContain('buildAuditChainRecord');
    expect(query).toContain('p_previous_hash: chain.previousHash');
    expect(query).toContain('p_event_hash: chain.eventHash');
    expect(migration).toContain('create table if not exists public.ai_incident_history');
    expect(migration).toContain('for update;');
    expect(migration).toContain('insert into public.ai_incident_history');
    expect(migration).toContain('insert into public.audit_events');
    expect(migration).toContain("raise exception 'audit chain previous hash mismatch'");
  });

  it('makes incident history server-owned, append-only and complete for RLS scanners', () => {
    expect(migration).toContain('alter table public.ai_incident_history force row level security');
    expect(migration).toContain('Authenticated users cannot insert ai incident history');
    expect(migration).toContain('Authenticated users cannot update ai incident history');
    expect(migration).toContain('Authenticated users cannot delete ai incident history');
    expect(migration).toContain(
      'revoke insert, update, delete on table public.ai_incident_history from anon, authenticated',
    );
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.ai_incident_history to service_role',
    );
  });

  it('restricts transitions, tenant-crossing AI-system references and direct RPC execution', () => {
    expect(migration).toContain("return query select 'invalid_transition'::text");
    expect(migration).toContain('s.organization_id = p_organization_id');
    expect(migration).toContain("return query select 'invalid_ai_system'::text");
    expect(migration).toContain('revoke all on function public.transition_ai_incident_atomic');
    expect(migration).toContain('to service_role;');
  });
});