import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const script = readFileSync('scripts/enterprise/assemble-conversation-runtime-closeout.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-conversation-runtime-closeout.yml', 'utf8');
const finalAuthorityWorkflow = readFileSync('.github/workflows/enterprise-100-final-authority.yml', 'utf8');

describe('enterprise conversation runtime closeout', () => {
  it('keeps the historical assembler fail-closed for four exact-SHA proof classes', () => {
    for (const marker of ['stripeRuntime', 'enterpriseRuntime', 'productionFinal', 'releaseGoNoGo']) {
      expect(script).toContain(marker);
    }
    expect(script).toContain("status === 'Complete'");
    expect(script).toContain('evidenceSha !== sha');
    expect(script).toContain("decision: complete ? 'CONVERSATION_COMPLETE'");
  });

  it('deprecates the manual run-id fan-in instead of preserving it as Enterprise authority', () => {
    expect(workflow).toContain('Enterprise Conversation Runtime Closeout (Deprecated)');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('user-supplied run IDs');
    expect(workflow).toContain('first-JSON selection');
    expect(workflow).toContain('Enterprise 100 Final Authority');
    expect(workflow).toContain('exit 1');
    expect(workflow).not.toContain('stripe_run_id');
    expect(workflow).not.toContain('production_final_run_id');
  });

  it('moves protected exact-main authority to the canonical final workflow', () => {
    expect(finalAuthorityWorkflow).toContain('environment: Production');
    expect(finalAuthorityWorkflow).toContain('actions: read');
    expect(finalAuthorityWorkflow).toContain('contents: read');
    expect(finalAuthorityWorkflow).toContain('check-github-environment-governance.mjs');
    expect(finalAuthorityWorkflow).toContain('fetch-enterprise-final-authority-evidence.mjs');
    expect(finalAuthorityWorkflow).toContain('check-enterprise-100-closure.mjs');
    expect(finalAuthorityWorkflow).toContain('write-enterprise-final-authority.mjs');
    expect(finalAuthorityWorkflow).toContain('retention-days: 365');
  });
});
