import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/final-legal-publication-gate.yml');
const workflow = readFileSync(workflowPath, 'utf8');

describe('final legal publication workflow exact-SHA replay contract', () => {
  it('allows an explicit exact-SHA manual replay without weakening the legal evidence gate', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('release_sha:');
    expect(workflow).toContain('required: true');
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("LEGAL_PUBLICATION_EXPECTED_SHA: ${{ inputs.release_sha || github.event.pull_request.head.sha || github.sha }}");
    expect(workflow).toContain("ref: ${{ inputs.release_sha || github.event.pull_request.head.sha || github.sha }}");
    expect(workflow).toContain('git fetch --no-tags origin main');
    expect(workflow).toContain('test "$(git rev-parse origin/main)" = "$expected"');
  });

  it('keeps the workflow read-only and preserves the strict legal publication evaluator', () => {
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('node scripts/compliance/check-final-legal-publication-gate.mjs --strict --write');
    expect(workflow).toContain('node scripts/compliance/generate-legal-counsel-handoff-bundle.mjs --strict --write');
    expect(workflow).not.toContain('contents: write');
  });
});
