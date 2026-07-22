import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/eu-ai-act-runtime-evidence-campaign.yml', 'utf8');
const validator = readFileSync('scripts/compliance/validate-eu-ai-act-runtime-evidence.mjs', 'utf8');
const registry = JSON.parse(readFileSync('docs/compliance/eu-ai-act-runtime-evidence-registry.json', 'utf8'));

describe('EU AI Act runtime evidence campaign', () => {
  it('is manual, protected and read-only', () => {
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).toContain('production-eu-ai-act-runtime-evidence');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');
  });

  it('requires exact current main SHA and explicit confirmation', () => {
    expect(workflow).toContain('RUN_EU_AI_ACT_RUNTIME_EVIDENCE');
    expect(workflow).toContain('git rev-parse origin/main');
    expect(workflow).toContain('persist-credentials: false');
  });

  it('covers all non-static workstreams without auto-promoting missing evidence', () => {
    expect(registry.evidence).toHaveLength(15);
    expect(new Set(registry.evidence.map((item) => item.id)).size).toBe(15);
    expect(validator).toContain('missing_evidence');
    expect(validator).toContain('invalid_or_stale_evidence');
    expect(validator).toContain('EU_AI_ACT_RUNTIME_NO_GO');
  });
});
