import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('AI inventory API contracts', () => {
  const collection = 'src/app/api/ai-systems/route.ts';
  const detail = 'src/app/api/ai-systems/[id]/route.ts';
  const queries = 'src/server/queries/ai-systems.ts';
  const atomicMigration = 'supabase/migrations/20260715121000_atomic_ai_system_reassessment.sql';

  it('covers create and list contracts', () => {
    const source = readRepoFile(collection);

    expect(source).toContain('export async function GET()');
    expect(source).toContain('export async function POST(request: Request)');
    expect(source).toContain('requireApiUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain("permission: 'read_ai_governance'");
    expect(source).toContain("return 'manage_ai_governance'");
    expect(source).toContain('permission: getWorkflowPermission(workflow)');
    expect(source).toContain('permissionDeniedResponse(permission)');
    expect(source).toContain('assertTrustedOrigin(request)');
    expect(source).toContain('checkDistributedRateLimit({');
    expect(source).toContain('parseJsonBodyWithZod(request, {');
    expect(source).toContain('classifyParsedAiSystemBody(body)');
    expect(source).toContain('createAiSystem({');
    expect(source).toContain('organizationId: organization.id');
    expect(source).toContain('createdBy: user.id');
    expect(source).toContain('riskLevel: result.classification.riskLevel');
    expect(source).toContain('obligations: result.classification.obligations');
    expect(source).toContain('nextActions: result.classification.nextActions');
    expect(source).toContain("action: 'ai_system_created'");
    expect(source).toContain('return noStoreJson({ system, roleAssessment: result.roleAssessment })');
  });

  it('covers detail and reassessment contracts', () => {
    const source = readRepoFile(detail);

    expect(source).toContain('export async function GET(_request: Request, { params }: AiSystemRouteParams)');
    expect(source).toContain('export async function PATCH(request: Request, { params }: AiSystemRouteParams)');
    expect(source).toContain('requireApiUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain("permission: 'read_ai_governance'");
    expect(source).toContain("permission: 'manage_ai_governance'");
    expect(source).toContain('getAiSystem(id, organization.id)');
    expect(source).toContain('listAiSystemHistory(id, organization.id)');
    expect(source).toContain('assertTrustedOrigin(request)');
    expect(source).toContain('checkDistributedRateLimit({');
    expect(source).toContain('parseJsonBodyWithZod(request, {');
    expect(source).toContain('classifyParsedAiSystemBody(body)');
    expect(source).toContain('updateAiSystem(id, organization.id, {');
    expect(source).toContain('reassessedBy: user.id');
    expect(source).toContain('expectedUpdatedAt: existing.updated_at');
    expect(source).toContain('riskLevel: result.classification.riskLevel');
    expect(source).toContain('obligations: result.classification.obligations');
    expect(source).toContain('nextActions: result.classification.nextActions');
    expect(source).toContain("action: 'ai_system_reassessed'");
    expect(source).toContain('previousRiskLevel: existing.risk_level');
    expect(source).toContain('return noStoreJson({ system, history, roleAssessment: result.roleAssessment })');
  });

  it('uses a backend-only atomic reassessment RPC with tenant and version locking', () => {
    const querySource = readRepoFile(queries);
    const migrationSource = readRepoFile(atomicMigration);

    expect(querySource).toContain("const ATOMIC_REASSESSMENT_RPC = 'reassess_ai_system_atomic'");
    expect(querySource).toContain('supabase.rpc(ATOMIC_REASSESSMENT_RPC, {');
    expect(querySource).toContain('p_system_id: systemId');
    expect(querySource).toContain('p_organization_id: organizationId');
    expect(querySource).toContain('p_expected_updated_at: input.expectedUpdatedAt');
    expect(querySource).toContain('p_actor_user_id: input.reassessedBy');
    expect(querySource).toContain("function aiSystemPatch(input: Omit<CreateAiSystemInput, 'organizationId' | 'createdBy'>)");
    expect(querySource).toContain('p_patch: aiSystemPatch(input)');
    expect(querySource).toContain("transition.outcome === 'state_changed'");
    expect(querySource).toContain("transition.outcome === 'not_found'");
    expect(querySource).toContain("return { status: 'conflict' }");

    expect(migrationSource).toContain('create or replace function public.reassess_ai_system_atomic(');
    expect(migrationSource).toContain('security definer');
    expect(migrationSource).toContain('set search_path = public, pg_temp');
    expect(migrationSource).toContain('and s.organization_id = p_organization_id');
    expect(migrationSource).toContain('for update;');
    expect(migrationSource).toContain('v_current.updated_at is distinct from p_expected_updated_at');
    expect(migrationSource).toContain('s.updated_at is not distinct from p_expected_updated_at');
    expect(migrationSource).toContain('insert into public.ai_system_history');
    expect(migrationSource).toContain("'reassessed'");
    expect(migrationSource).toContain("return query select 'updated'::text, to_jsonb(v_updated)");
    expect(migrationSource).toContain(
      'revoke all on function public.reassess_ai_system_atomic(uuid, uuid, timestamptz, uuid, jsonb) from authenticated',
    );
    expect(migrationSource).toContain(
      'grant execute on function public.reassess_ai_system_atomic(uuid, uuid, timestamptz, uuid, jsonb) to service_role',
    );
  });

  it('rejects stale reassessments before success audit evidence', () => {
    const routeSource = readRepoFile(detail);
    const querySource = readRepoFile(queries);

    expect(routeSource).toContain("updateResult.status === 'conflict'");
    expect(routeSource).toContain("error: 'ai_system_state_changed'");
    expect(routeSource).toContain('{ status: 409 }');

    const conflictGuard = routeSource.indexOf("error: 'ai_system_state_changed'");
    const successAudit = routeSource.indexOf("action: 'ai_system_reassessed'");
    const rpcCall = querySource.indexOf('supabase.rpc(ATOMIC_REASSESSMENT_RPC');
    const successfulReturn = querySource.indexOf("return { status: 'updated', system: transition.system }");

    expect(conflictGuard).toBeGreaterThan(-1);
    expect(successAudit).toBeGreaterThan(conflictGuard);
    expect(rpcCall).toBeGreaterThan(-1);
    expect(successfulReturn).toBeGreaterThan(rpcCall);
  });

  it('keeps the reassessment history write inside the RPC transaction', () => {
    const querySource = readRepoFile(queries);
    const updateFunctionStart = querySource.indexOf('export async function updateAiSystem(');
    const updateFunction = querySource.slice(updateFunctionStart);

    expect(updateFunction).not.toContain('insertAiSystemHistory({');
    expect(updateFunction).not.toContain(".from('ai_systems')\n    .update(");
    expect(readRepoFile(atomicMigration)).toContain('insert into public.ai_system_history');
  });

  it('keeps denial and no-store paths explicit', () => {
    for (const path of [collection, detail]) {
      const source = readRepoFile(path);

      expect(source).toContain("noStoreJson({ error: 'organization_required' }, { status: 403 })");
      expect(source).toContain('permissionDeniedResponse(permission)');
      expect(source).toContain('secureApiError(error)');
      expect(source).toContain('noStoreJson');
    }
  });
});
