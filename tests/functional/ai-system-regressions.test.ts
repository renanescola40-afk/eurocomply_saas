import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { aiSystemBodySchema } from '@/server/ai-governance/system-payload';

const rpcMigration = readFileSync(
  'supabase/migrations/20260904065952_reconcile_ai_system_atomic_rpcs_20260904.sql',
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
    expect(rpcMigration).not.toContain("classification_summary,obligations,next_actions,last_reassessed_at\n  ) values (\n    p_organization_id,p_actor_user_id");
  });

  it('rejects non-string elements before converting JSON arrays to text arrays', () => {
    expect(rpcMigration).toContain("jsonb_array_elements(p_system -> 'obligations')");
    expect(rpcMigration).toContain("jsonb_array_elements(p_system -> 'next_actions')");
    expect(rpcMigration).toContain("jsonb_array_elements(p_patch -> 'obligations')");
    expect(rpcMigration).toContain("jsonb_array_elements(p_patch -> 'next_actions')");
  });
});
