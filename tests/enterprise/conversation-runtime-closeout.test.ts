import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const script = readFileSync('scripts/enterprise/assemble-conversation-runtime-closeout.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-conversation-runtime-closeout.yml', 'utf8');

describe('enterprise conversation runtime closeout', () => {
  it('requires all four exact-SHA proof classes', () => {
    for (const marker of ['stripeRuntime', 'enterpriseRuntime', 'productionFinal', 'releaseGoNoGo']) {
      expect(script).toContain(marker);
    }
    expect(script).toContain("status === 'Complete'");
    expect(script).toContain('evidenceSha !== sha');
    expect(script).toContain("decision: complete ? 'CONVERSATION_COMPLETE'");
  });

  it('uses protected read-only exact-main workflow controls', () => {
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('CLOSE_ENTERPRISE_CONVERSATION');
    expect(workflow).toMatch(/gh api ["']?repos\/\$\{GITHUB_REPOSITORY\}\/commits\/main["']? --jq \.sha/);
    expect(workflow).toContain('retention-days: 365');
  });
});
