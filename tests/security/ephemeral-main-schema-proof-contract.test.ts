import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = fs.readFileSync(
  '.github/workflows/ephemeral-supabase-project-smoke.yml',
  'utf8',
);

describe('exact-main ephemeral Supabase schema proof', () => {
  it('runs for both reviewed PR heads and changes merged to main', () => {
    expect(workflow).toContain('  push:\n    branches: [main]');
    expect(workflow).toContain('  pull_request:\n    branches: [main]');
    expect(workflow).toContain(
      "EXPECTED_HEAD_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
    );
  });

  it('reruns when human-review or decision inputs change the replay authorization boundary', () => {
    for (const path of [
      "'docs/security/evidence/human-review/**'",
      "'docs/security/decisions/**'",
      "'scripts/recovery/run-reviewed-ephemeral-schema-boundary-v4.mjs'",
      "'scripts/recovery/run-ephemeral-project-schema-replay.mjs'",
      "'supabase/migrations/**'",
    ]) {
      expect(workflow.split(path).length - 1).toBe(2);
    }
  });

  it('checks out and verifies the exact assessed SHA without credentials', () => {
    expect(workflow).toContain('ref: ${{ env.EXPECTED_HEAD_SHA }}');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"');
  });

  it('deduplicates stale runs without mixing separate pull requests', () => {
    expect(workflow).toContain(
      "group: ephemeral-supabase-project-smoke-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || 'main' }}",
    );
    expect(workflow).toContain('cancel-in-progress: true');
  });

  it('binds sanitized failure diagnostics to the exact assessed SHA', () => {
    expect(workflow).toContain(
      'name: ephemeral-schema-replay-diagnostics-${{ env.EXPECTED_HEAD_SHA }}',
    );
    expect(workflow).toContain('rm -f "$raw_log"');
    expect(workflow).toContain('retention-days: 14');
  });
});
