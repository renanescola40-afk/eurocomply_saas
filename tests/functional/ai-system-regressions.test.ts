import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { aiSystemBodySchema } from '@/server/ai-governance/system-payload';

const rpcMigration = readFileSync(
  'supabase/migrations/20261003134528_fix_ai_system_text_array_rpc_contract.sql',
  'utf8',
);

describe('AI system functional QA regressions', () => {
  it('requires processed-data context when personal data is used', () => {
    const result = aiSystemBodySchema.safeParse({
      name: 'Assistente de Atendimento',
      useCase: 'Responder perguntas frequentes e ajudar clientes durante o atendimento',
      usesPersonalData: true,
      processedData: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'processedData')).toBe(true);
    }
  });

  it('accepts a personal-data system when processed data is described', () => {
    const result = aiSystemBodySchema.safeParse({
      name: 'Assistente de Atendimento',
      useCase: 'Responder perguntas frequentes e ajudar clientes durante o atendimento',
      usesPersonalData: true,
      processedData: 'Nome, email e conteúdo das mensagens dos clientes',
    });

    expect(result.success).toBe(true);
  });

  it('adapts AI-system JSON arrays to the live jsonb or text[] column contract', () => {
    expect(rpcMigration).toContain("obligations_type not in ('jsonb', 'text[]')");
    expect(rpcMigration).toContain('v_obligations public.ai_systems.obligations%type;');
    expect(rpcMigration).toContain('v_next_actions public.ai_systems.next_actions%type;');
    expect(rpcMigration).toContain('from jsonb_populate_record(');
    expect(rpcMigration).toContain('null::public.ai_systems');
    expect(rpcMigration).toContain("'obligations', p_system -> 'obligations'");
    expect(rpcMigration).toContain("'next_actions', p_system -> 'next_actions'");
    expect(rpcMigration).toContain("'obligations', p_patch -> 'obligations'");
    expect(rpcMigration).toContain("'next_actions', p_patch -> 'next_actions'");
    expect(rpcMigration).not.toContain("array(select jsonb_array_elements_text(p_system -> 'obligations'))");
    expect(rpcMigration).not.toContain("obligations=array(select jsonb_array_elements_text(p_patch -> 'obligations'))");
  });

  it('rejects non-string elements before adapting JSON arrays to the database row type', () => {
    expect(rpcMigration).toContain("jsonb_array_elements(p_system -> 'obligations')");
    expect(rpcMigration).toContain("jsonb_array_elements(p_system -> 'next_actions')");
    expect(rpcMigration).toContain("jsonb_array_elements(p_patch -> 'obligations')");
    expect(rpcMigration).toContain("jsonb_array_elements(p_patch -> 'next_actions')");
  });

  it('keeps atomic RPC execution restricted to service_role', () => {
    expect(rpcMigration).toContain('revoke all on function public.create_ai_system_atomic(uuid,uuid,jsonb) from public, anon, authenticated;');
    expect(rpcMigration).toContain('grant execute on function public.create_ai_system_atomic(uuid,uuid,jsonb) to service_role;');
    expect(rpcMigration).toContain('revoke all on function public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb) from public, anon, authenticated;');
    expect(rpcMigration).toContain('grant execute on function public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb) to service_role;');
  });
});
