import { describe, expect, it } from 'vitest';

import { aiSystemBodySchema } from '@/server/ai-governance/system-payload';

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
});
