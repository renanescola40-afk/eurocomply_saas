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
const sanitizer = readFileSync(
  join(process.cwd(), 'scripts/product/sanitize-fria-playwright-report.mjs'),
  'utf8',
);
const runtimeAcceptance = readFileSync(
  join(process.cwd(), 'tests/e2e/fria-lifecycle-runtime-acceptance.spec.ts'),
  'utf8',
);

describe('Product runtime acceptance reliability contracts', () => {
  it('reruns Product FRIA when its disposable recovery boundary changes and pins setup-node', () => {
    const recoveryPathBindings = workflow.match(/- 'scripts\/recovery\/\*\*'/g) ?? [];
    expect(recoveryPathBindings).toHaveLength(2);
    expect(workflow).toContain(
      'uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
    );
    expect(workflow).not.toContain('uses: actions/setup-node@v7');
  });

  it('fails early when the assessed Next process exits before readiness', () => {
    expect(workflow).toContain('next_pid=$!');
    expect(workflow).toContain('if ! kill -0 "$next_pid" 2>/dev/null; then');
    expect(workflow).toContain('Product QA application process exited before readiness.');
    expect(workflow).toContain("if [ \"$ready\" != 'true' ]; then");
    expect(workflow).toContain('Product QA application did not become ready within the bounded startup window.');
  });

  it('keeps browser retry bounded while activating the existing first-retry Playwright trace contract', () => {
    expect(workflow).toContain('--project=chromium --reporter=line,github,json --retries=1');
    expect(workflow).not.toContain('--retries=2');
    expect(workflow).not.toContain('--retries=3');
    expect(runtimeAcceptance).toContain('test.setTimeout(180_000)');
    expect(runtimeAcceptance).not.toContain('test.setTimeout(300_000)');
  });

  it('emits only coarse app and Auth health state after a persistent browser failure', () => {
    expect(workflow).toContain('app_healthy=false');
    expect(workflow).toContain('auth_healthy=false');
    expect(workflow).toContain('Product QA sanitized failure diagnostic: app_healthy=$app_healthy auth_healthy=$auth_healthy');
    expect(workflow).not.toContain('Product QA sanitized failure diagnostic: $E2E_FRIA_OWNER_EMAIL');
    expect(workflow).not.toContain('Product QA sanitized failure diagnostic: $E2E_FRIA_OWNER_PASSWORD');
    expect(workflow).not.toContain('Product QA sanitized failure diagnostic: $SUPABASE_SERVICE_ROLE_KEY');
  });

  it('publishes only sanitized bounded Playwright diagnostics after browser or global setup failure', () => {
    expect(workflow).toContain(
      'PLAYWRIGHT_JSON_OUTPUT_NAME: ${{ runner.temp }}/fria-playwright-raw.json',
    );
    expect(workflow).toContain('scripts/product/sanitize-fria-playwright-report.mjs');
    expect(workflow).toContain('if: failure()');
    expect(sanitizer).toContain("schema: 'risck-comply.fria-playwright-failure.v2'");
    expect(sanitizer).toContain('globalErrors: (report.errors ?? []).slice(0, 5).map(sanitizeError)');
    expect(sanitizer).toContain('function sanitizeError(error)');
    expect(sanitizer).toContain('credentialsStored: false');
    expect(sanitizer).toContain('tokensStored: false');
    expect(sanitizer).toContain('cookiesStored: false');
    expect(sanitizer).toContain('rawTraceStored: false');
    expect(sanitizer).toContain('rmSync(rawPath)');
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

  it('keeps onboarding readiness separate from durable commercial authority', () => {
    expect(fixture).toContain("onboarding_status: 'completed'");
    expect(fixture).toContain("onboarding_step: 'completed'");
    expect(fixture).toContain('onboarding_completed_at: onboardingCompletedAt');
    expect(fixture).toContain("selected_plan: 'professional'");
    expect(fixture).toContain('fria_licensed_onboarding_state_verification_failed');
    expect(fixture).toContain('fria_unlicensed_onboarding_state_verification_failed');
    expect(fixture).toContain(".from('enterprise_entitlement_sources')");
    expect(fixture).toContain('unlicensedSourceCount !== 0');
    expect(fixture).toContain('unlicensedSnapshotCount !== 0');
  });
});
