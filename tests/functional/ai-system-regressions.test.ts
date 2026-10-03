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

  it('converts AI-system JSON arrays to PostgreSQL text arrays in create and reassess RPCs', () => {
    expect(rpcMigration).toContain("array(select jsonb_array_elements_text(p_system -> 'obligations'))");
    expect(rpcMigration).toContain("array(select jsonb_array_elements_text(p_system -> 'next_actions'))");
    expect(rpcMigration).toContain("obligations=array(select jsonb_array_elements_text(p_patch -> 'obligations'))");
    expect(rpcMigration).toContain("next_actions=array(select jsonb_array_elements_text(p_patch -> 'next_actions'))");
  });

  it('rejects non-string elements before converting JSON arrays to text arrays', () => {
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
