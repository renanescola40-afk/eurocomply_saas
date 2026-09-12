import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const TERMS_PAGE = new URL('../src/app/[locale]/terms/page.tsx', import.meta.url);
const DPA_PAGE = new URL('../src/app/[locale]/dpa/page.tsx', import.meta.url);

describe('Legal Package V1 public review consistency', () => {
  it('preserves payment-cure restoration and Portuguese billing-authority boundaries', async () => {
    const source = await readFile(TERMS_PAGE, 'utf8');

    expect(source).toContain(
      'Access should be restored after the relevant cure or risk condition is resolved, subject to operational validation and any lawful continuing restriction.',
    );
    expect(source).toContain(
      'O acesso deve ser restaurado depois de resolvida a condição de cura ou risco aplicável, sujeito a validação operacional e a qualquer restrição legal que continue aplicável.',
    );
    expect(source).toContain(
      'Os preços exatos, intervalos de faturação, capacidades incluídas e add-ons adquiríveis devem corresponder à autoridade de billing vigente no momento da compra.',
    );
  });

  it('preserves apparently-unlawful instruction handling in both reviewed DPA languages', async () => {
    const source = await readFile(DPA_PAGE, 'utf8');

    expect(source).toContain(
      'If an instruction appears to infringe applicable Union or Member-State data-protection law, the processor-side process must allow that concern to be raised promptly',
    );
    expect(source).toContain(
      'Se uma instrução aparentar infringir a legislação aplicável de proteção de dados da União ou de um Estado-Membro, o processo do subcontratante deve permitir que essa preocupação seja levantada prontamente',
    );
    expect(source).toContain(
      'Customer Content is not authorised for training third-party or provider AI/ML models without a separate specific lawful basis or authorisation',
    );
  });
});
