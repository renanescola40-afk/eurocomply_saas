import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-systems/route.ts', 'utf8');
const migration = readFileSync(
  'supabase/migrations/20260715143000_atomic_enterprise_evidence_pack_creation.sql',
  'utf8',
);

describe('evidence pack creation integrity', () => {
  it('creates the pack and all required items through one backend-only transaction', () => {
    expect(route).toContain(".rpc('create_enterprise_evidence_pack_atomic'");
    expect(route).not.toContain(".from('enterprise_evidence_packs')\n    .insert");
    expect(route).not.toContain('evidence_pack_cleanup_failed');

    expect(migration).toContain('create or replace function public.create_enterprise_evidence_pack_atomic');
    expect(migration).toContain('language plpgsql');
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = public');
    expect(migration).toContain('insert into public.enterprise_evidence_packs');
    expect(migration).toContain('insert into public.enterprise_evidence_pack_items');
    expect(migration).toContain('grant execute on function public.create_enterprise_evidence_pack_atomic');
    expect(migration).toContain('to service_role');
    expect(migration).toContain('revoke all on function public.create_enterprise_evidence_pack_atomic');
    expect(migration).toContain('from authenticated');
    expect(migration).toContain('from anon');
  });

  it('rejects malformed RPC output before writing success audit evidence', () => {
    const workflow = route.slice(
      route.indexOf('async function createEvidencePackWorkflow'),
      route.indexOf('async function createVendorDiligenceWorkflow'),
    );

    expect(workflow).toContain("throw new Error('enterprise_evidence_pack_invalid_result')");
    expect(workflow).toContain('!result?.pack?.id');
    expect(workflow).toContain('!Array.isArray(result.items)');
  });

  it('records the created audit event only after the atomic workflow returns successfully', () => {
    const workflowCall = route.indexOf('const result = await createEvidencePackWorkflow');
    const auditEvent = route.indexOf("action: 'enterprise_evidence_pack_created'");
    const successResponse = route.indexOf('return noStoreJson(result, { status: 201 })');

    expect(workflowCall).toBeGreaterThan(-1);
    expect(auditEvent).toBeGreaterThan(workflowCall);
    expect(successResponse).toBeGreaterThan(auditEvent);
  });
});
