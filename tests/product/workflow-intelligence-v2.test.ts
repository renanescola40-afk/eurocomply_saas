import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const APPROVALS = new URL('../../src/app/[locale]/aprovacoes/approvals-client.tsx', import.meta.url);
const ROLE_WIZARD = new URL('../../src/app/[locale]/ai-systems/role-wizard-card.tsx', import.meta.url);

describe('workflow and intelligence surfaces V2', () => {
  it('keeps approvals on the enterprise graphite/cobalt surface without changing the approval API contract', async () => {
    const source = await readFile(APPROVALS, 'utf8');

    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('text-blue-200/65');
    expect(source).toContain('hover:border-blue-300/25');
    expect(source).toContain("fetch(`/api/documents/${encodeURIComponent(id)}/approval`");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("const action = status === 'Aprovado' ? 'approve' : 'reject'");
    expect(source).toContain('workflow demo seguro');
    expect(source).toContain("status === 'Aprovado'");
    expect(source).toContain('border-emerald-300/15');
    expect(source).toContain('border-rose-300/15');
    expect(source).toContain('border-amber-300/15');
    expect(source).not.toContain('text-sm uppercase tracking-[0.3em] text-emerald-300');
    expect(source).not.toContain('hover:border-emerald-300/50 hover:bg-emerald-300/10');
  });

  it('renders the provider/deployer role wizard as an intelligence surface while preserving governance evaluation', async () => {
    const source = await readFile(ROLE_WIZARD, 'utf8');

    expect(source).toContain('evaluateAiGovernanceRole(input)');
    expect(source).toContain('assessment.needsLegalReview');
    expect(source).toContain('assessment.signals.slice(0, 4)');
    expect(source).toContain('assessment.nextSteps.slice(0, 6)');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('border-violet-300/15');
    expect(source).toContain("role === 'deployer'");
    expect(source).toContain("return 'border-blue-300/20 bg-blue-300/[0.07] text-blue-100/85'");
    expect(source).toContain("confidence === 'high'");
    expect(source).toContain('border-emerald-300/20');
    expect(source).not.toContain('rounded-3xl border bg-background p-5');
    expect(source).not.toContain("role === 'deployer') return 'border-emerald-500/30");
  });
});
