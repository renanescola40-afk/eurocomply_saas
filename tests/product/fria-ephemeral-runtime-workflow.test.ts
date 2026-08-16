import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/product-fria-ephemeral-qa.yml', 'utf8');

describe('Product FRIA ephemeral runtime workflow', () => {
  it('promotes the reviewed DB-only runtime by preserving its volume before starting the full stack', () => {
    const stop = 'supabase --workdir "$RECOVERY_EPHEMERAL_WORKDIR" stop';
    const start = 'supabase --workdir "$RECOVERY_EPHEMERAL_WORKDIR" start';

    expect(workflow).toContain('FRIA_SCHEMA_MIGRATION_COUNT');
    expect(workflow).toContain(stop);
    expect(workflow).toContain(start);
    expect(workflow.indexOf(stop)).toBeLessThan(workflow.indexOf(start));
    expect(workflow).not.toContain('supabase --workdir "$RECOVERY_EPHEMERAL_WORKDIR" stop --no-backup');
    expect(workflow).toContain('test "$promoted_count" = "$FRIA_SCHEMA_MIGRATION_COUNT"');
  });

  it('reads real full-stack status keys rather than deriving or hardcoding API credentials', () => {
    expect(workflow).toContain('status -o env > "$RUNNER_TEMP/fria-supabase-status.env"');
    expect(workflow).toContain("first_value('API_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')");
    expect(workflow).toContain("'ANON_KEY'");
    expect(workflow).toContain("'PUBLISHABLE_KEY'");
    expect(workflow).toContain("'SERVICE_ROLE_KEY'");
    expect(workflow).toContain("'SECRET_KEY'");
    expect(workflow).not.toContain('local_role_key');
    expect(workflow).not.toContain("'alg': 'HS256'");
  });

  it('keeps the runtime loopback-only and masks credentials before exporting them', () => {
    expect(workflow).toContain("host not in {'127.0.0.1', 'localhost', '::1'}");
    expect(workflow).toContain("print(f'::add-mask::{value}')");
    expect(workflow).toContain("'SUPABASE_SERVICE_ROLE_KEY': service_role");
    expect(workflow).toContain('rm -f "$RUNNER_TEMP/fria-supabase-status.env"');
    expect(workflow).not.toContain('cat "$RUNNER_TEMP/fria-supabase-status.env"');
  });

  it('preserves exact-SHA evidence and sanitized runtime acceptance requirements', () => {
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"');
    expect(workflow).toContain("evidence.outcome !== 'passed'");
    expect(workflow).toContain('evidence.targetSha !== process.env.EXPECTED');
    expect(workflow).toContain("credentialsStored','emailsStored','userIdentifiersStored','organizationIdentifiersStored','rawProviderResponsesStored");
  });
});
