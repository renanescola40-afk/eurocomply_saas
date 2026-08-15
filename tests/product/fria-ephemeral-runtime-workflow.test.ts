import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/product-fria-ephemeral-qa.yml', 'utf8');

describe('Product FRIA ephemeral runtime workflow', () => {
  it('asks Supabase CLI for the application runtime variable names explicitly', () => {
    expect(workflow).toContain('--override-name api.url=NEXT_PUBLIC_SUPABASE_URL');
    expect(workflow).toContain('--override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(workflow).toContain('--override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY');
  });

  it('accepts legacy local role keys and derives disposable HS256 role keys only from the local JWT secret when needed', () => {
    expect(workflow).toContain("first_value('NEXT_PUBLIC_SUPABASE_URL', 'API_URL', 'SUPABASE_URL')");
    expect(workflow).toContain("first_value('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'ANON_KEY', 'SUPABASE_ANON_KEY')");
    expect(workflow).toContain("first_value('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY')");
    expect(workflow).toContain("first_value('JWT_SECRET', 'SUPABASE_JWT_SECRET')");
    expect(workflow).toContain("local_role_key(jwt_secret, 'anon')");
    expect(workflow).toContain("local_role_key(jwt_secret, 'service_role')");
    expect(workflow).toContain("'alg': 'HS256'");
    expect(workflow).toContain("'iss': 'supabase-demo'");
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
