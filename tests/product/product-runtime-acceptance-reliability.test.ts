import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/product-fria-ephemeral-qa.yml'),
  'utf8',
);
const fixture = readFileSync(
  join(process.cwd(), 'scripts/product/create-fria-ephemeral-fixtures.mjs'),
  'utf8',
);

describe('Product runtime acceptance reliability contracts', () => {
  it('fails early when the assessed Next process exits before readiness', () => {
    expect(workflow).toContain('next_pid=$!');
    expect(workflow).toContain('if ! kill -0 "$next_pid" 2>/dev/null; then');
    expect(workflow).toContain('Product QA application process exited before readiness.');
    expect(workflow).toContain("if [ \"$ready\" != 'true' ]; then");
    expect(workflow).toContain('Product QA application did not become ready within the bounded startup window.');
  });

  it('keeps browser retry bounded while activating the existing first-retry Playwright trace contract', () => {
    expect(workflow).toContain('--project=chromium --reporter=line,github --retries=1');
    expect(workflow).not.toContain('--retries=2');
    expect(workflow).not.toContain('--retries=3');
  });

  it('emits only coarse app and Auth health state after a persistent browser failure', () => {
    expect(workflow).toContain('app_healthy=false');
    expect(workflow).toContain('auth_healthy=false');
    expect(workflow).toContain('Product QA sanitized failure diagnostic: app_healthy=$app_healthy auth_healthy=$auth_healthy');
    expect(workflow).not.toContain('Product QA sanitized failure diagnostic: $E2E_FRIA_OWNER_EMAIL');
    expect(workflow).not.toContain('Product QA sanitized failure diagnostic: $E2E_FRIA_OWNER_PASSWORD');
    expect(workflow).not.toContain('Product QA sanitized failure diagnostic: $SUPABASE_SERVICE_ROLE_KEY');
  });

  it('proves disposable owner and approver password grants before browser acceptance', () => {
    expect(fixture).toContain("const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');");
    expect(fixture).toContain('await authClient.auth.signInWithPassword({');
    expect(fixture).toContain("await verifyPasswordGrant(url, anonKey, owner, 'owner');");
    expect(fixture).toContain("await verifyPasswordGrant(url, anonKey, approver, 'approver');");
    expect(fixture).toContain('!data.session?.access_token');
    expect(fixture).toContain('data.user?.id !== identity.id');
    expect(fixture).not.toContain('console.log(data.session');
    expect(fixture).not.toContain('console.log(identity.password');
  });
});
