import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve('.github/workflows/supabase-migration-evidence-latest-main-guard.yml');
const workflow = readFileSync(workflowPath, 'utf8');

describe('Supabase migration evidence latest-main guard', () => {
  it('runs only from trusted main push or explicit dispatch', () => {
    expect(workflow).toContain('push:\n    branches: [main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request_target:');
  });

  it('uses only GitHub Actions write permission', () => {
    expect(workflow).toContain('permissions:\n  contents: read\n  actions: write');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('environment: production');
  });

  it('cancels only non-terminal operational bootstrap runs from obsolete SHAs', () => {
    expect(workflow).toContain('BOOTSTRAP_WORKFLOW: supabase-migration-evidence-bootstrap.yml');
    expect(workflow).toContain('select(.event == "push" or .event == "workflow_dispatch")');
    expect(workflow).toContain('select(.head_sha | ascii_downcase != $sha)');
    expect(workflow).toContain('.status == "queued"');
    expect(workflow).toContain('.status == "in_progress"');
    expect(workflow).toContain('.status == "pending"');
    expect(workflow).toContain('.status == "waiting"');
    expect(workflow).toContain('.status == "requested"');
    expect(workflow).toContain('/actions/runs/${run_id}/cancel');
    expect(workflow).toContain('test "${head_sha,,}" != "${TARGET_SHA,,}"');
  });

  it('rechecks current main immediately before each cancellation', () => {
    expect(workflow).toContain('latest_main="$(gh api "repos/${GITHUB_REPOSITORY}/commits/main"');
    expect(workflow).toContain('if [ "${TARGET_SHA,,}" != "${latest_main,,}" ]; then');
    expect(workflow).toContain('refusing to cancel any additional bootstrap runs');
  });

  it('proves the workflow subject is current main and preserves a non-cancelled current bootstrap', () => {
    expect(workflow).toContain('repos/${GITHUB_REPOSITORY}/commits/main');
    expect(workflow).toContain('test "${TARGET_SHA,,}" = "${current_main,,}"');
    expect(workflow).toContain('select(.conclusion != "cancelled")');
    expect(workflow).toContain('test "$current_runs" -ge 1');
  });

  it('tolerates only the benign race where a stale run completed first', () => {
    expect(workflow).toContain("if [ \"$refreshed_status\" = 'completed' ]; then");
    expect(workflow).toContain('Failed to retire stale bootstrap run ${run_id}');
    expect(workflow).toContain('exit 1');
  });

  it('does not mutate Supabase, migration history or production providers', () => {
    for (const forbidden of [
      'supabase db push',
      'supabase migration repair',
      'psql ',
      'SUPABASE_DB',
      'VERCEL_TOKEN',
      'STRIPE_SECRET_KEY',
      'curl ',
    ]) {
      expect(workflow).not.toContain(forbidden);
    }
    expect(workflow).toContain('- Supabase/database mutation: no');
    expect(workflow).toContain('- Migration-history mutation: no');
    expect(workflow).toContain('- Production write authorization: no');
  });
});
