import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('atomic AI-system creation', () => {
  const queryPath = 'src/server/queries/ai-systems.ts';
  const migrationPath = 'supabase/migrations/20260716184500_atomic_ai_system_creation.sql';

  it('uses one backend-only RPC instead of a post-create best-effort history write', () => {
    const querySource = readRepoFile(queryPath);
    const createFunction = querySource.slice(
      querySource.indexOf('export async function createAiSystem('),
      querySource.indexOf('export async function updateAiSystem('),
    );

    expect(querySource).toContain("const ATOMIC_CREATE_RPC = 'create_ai_system_atomic'");
    expect(createFunction).toContain('supabase.rpc(ATOMIC_CREATE_RPC, {');
    expect(createFunction).toContain('p_organization_id: input.organizationId');
    expect(createFunction).toContain('p_actor_user_id: input.createdBy');
    expect(createFunction).toContain('p_system: aiSystemPatch(input)');
    expect(createFunction).not.toContain(".from('ai_systems')");
    expect(createFunction).not.toContain('insertAiSystemHistory');
    expect(querySource).not.toContain('history_insert_failed');
  });

  it('commits the AI system and creation snapshot in the same database function', () => {
    const migrationSource = readRepoFile(migrationPath);

    expect(migrationSource).toContain('create or replace function public.create_ai_system_atomic(');
    expect(migrationSource).toContain('security definer');
    expect(migrationSource).toContain('set search_path = public, pg_temp');
    expect(migrationSource).toContain('insert into public.ai_systems (');
    expect(migrationSource).toContain('returning * into v_created');
    expect(migrationSource).toContain('insert into public.ai_system_history (');
    expect(migrationSource).toContain("'created'");
    expect(migrationSource).toContain("return query select 'created'::text, to_jsonb(v_created)");
  });

  it('keeps direct client roles unable to invoke the privileged RPC', () => {
    const migrationSource = readRepoFile(migrationPath);

    expect(migrationSource).toContain(
      'revoke all on function public.create_ai_system_atomic(uuid, uuid, jsonb) from public',
    );
    expect(migrationSource).toContain(
      'revoke all on function public.create_ai_system_atomic(uuid, uuid, jsonb) from anon',
    );
    expect(migrationSource).toContain(
      'revoke all on function public.create_ai_system_atomic(uuid, uuid, jsonb) from authenticated',
    );
    expect(migrationSource).toContain(
      'grant execute on function public.create_ai_system_atomic(uuid, uuid, jsonb) to service_role',
    );
  });

  it('fails closed for invalid results and explicit commercial denials', () => {
    const querySource = readRepoFile(queryPath);

    expect(querySource).toContain(
      "type AtomicCreateOutcome = 'created' | 'invalid_input' | 'subscription_required' | 'quota_exceeded'",
    );
    expect(querySource).toContain("transition.outcome === 'subscription_required'");
    expect(querySource).toContain("transition.outcome === 'quota_exceeded'");
    expect(querySource).toContain("throw new Error('AI system creation RPC returned an invalid result')");
    expect(querySource).toContain("throw new Error('AI system creation RPC rejected validated input')");
  });
});
