import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type PackageManifest = { engines: { node: string } };

const workflow = readFileSync('.github/workflows/e2e.yml', 'utf8');

function extractQaPreflight() {
  const startTag = "          node --input-type=module <<'NODE'\n";
  const endTag = '\n          NODE\n';
  const start = workflow.indexOf(startTag);
  const end = workflow.indexOf(endTag, start + startTag.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const body = workflow.slice(start + startTag.length, end);
  return body.split('\n').map((line) => {
    // YAML literal blocks may contain genuinely empty lines; do not treat those
    // as indentation corruption or throw before Vitest registers the cases.
    if (line === '') return '';
    expect(line.startsWith('          '), 'Every nonblank guard source line must retain YAML block indentation').toBe(true);
    return line.slice(10);
  }).join('\n');
}

const qaPreflight = extractQaPreflight();
const qaDefaults: Record<string, string> = {
  E2E_BASE_URL: 'https://qa.example.invalid',
  NEXT_PUBLIC_SUPABASE_URL: 'https://isolateddisposableqa.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-fixture',
  SUPABASE_SERVICE_ROLE_KEY: 'test-role-fixture',
  STRIPE_SECRET_KEY: 'sk_test_fake_fixture',
  STRIPE_WEBHOOK_SECRET: 'whsec_fake_fixture',
  E2E_OWNER_EMAIL: 'qa-owner@example.invalid',
  E2E_OWNER_PASSWORD: 'nonsecret-disposable-fixture',
  E2E_QA_MAIL_SINK_CONFIRMED: 'true',
};

function exercisePreflight(overrides: Record<string, string | null> = {}) {
  // Never use inherited provider credentials: the child receives only fixtures.
  const env = { ...qaDefaults };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete env[key];
    else env[key] = value;
  }
  return spawnSync(process.execPath, ['--input-type=module', '--eval', qaPreflight], {
    env, encoding: 'utf8', timeout: 5_000,
  });
}

describe('manual Playwright E2E execution safety', () => {
  it('uses a Node version allowed by package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as PackageManifest;
    const min = Number(pkg.engines.node.match(/>=\s*(\d+)/)?.[1]);
    const max = Number(pkg.engines.node.match(/<\s*(\d+)/)?.[1]);
    const versions = [...workflow.matchAll(/^\s+node-version:\s*['"]?(\d+)['"]?\s*$/gm)];
    expect(versions).toHaveLength(1);
    expect(Number(versions[0][1])).toBeGreaterThanOrEqual(min);
    expect(Number(versions[0][1])).toBeLessThan(max);
  });

  it('does not wire generic live-or-test provider secrets into E2E', () => {
    expect(workflow).not.toContain('secrets.STRIPE_SECRET_KEY');
    expect(workflow).not.toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).toContain('secrets.E2E_QA_STRIPE_SECRET_KEY');
    expect(workflow).toContain('secrets.E2E_QA_SUPABASE_SERVICE_ROLE_KEY');
  });

  it('permits isolated QA test-mode fixtures without sending network requests', () => {
    const run = exercisePreflight();
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain('Isolated E2E QA preflight passed');
  });

  it('rejects real production application and Supabase targets', () => {
    const app = exercisePreflight({ E2E_BASE_URL: 'https://www.risckcomply.com' });
    expect(app.status).not.toBe(0);
    expect(app.stderr).toContain('qa_runtime_cannot_target_public_production');
    const db = exercisePreflight({
      NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co',
    });
    expect(db.status).not.toBe(0);
    expect(db.stderr).toContain('qa_runtime_requires_nonproduction_supabase');
  });

  it('rejects trailing-DNS-dot production aliases, production subdomains and URL credentials', () => {
    for (const target of [
      'https://www.risckcomply.com.',
      'https://risckcomply.com.',
      'https://qa.risckcomply.com',
      'https://test-user@qa.example.invalid',
    ]) {
      const run = exercisePreflight({ E2E_BASE_URL: target });
      expect(run.status, target).not.toBe(0);
      expect(run.stderr, target).toContain('qa_runtime_cannot_target_public_production');
    }
  });

  it('rejects Stripe live keys, missing QA identities and unconfirmed mail sink', () => {
    const live = exercisePreflight({ STRIPE_SECRET_KEY: 'sk_live_fake_fixture' });
    expect(live.status).not.toBe(0);
    expect(live.stderr).toContain('qa_runtime_requires_stripe_test_keys');
    const noOwner = exercisePreflight({ E2E_OWNER_PASSWORD: null });
    expect(noOwner.status).not.toBe(0);
    expect(noOwner.stderr).toContain('qa_runtime_missing_configuration');
    const mail = exercisePreflight({ E2E_QA_MAIL_SINK_CONFIRMED: 'false' });
    expect(mail.status).not.toBe(0);
    expect(mail.stderr).toContain('qa_runtime_mail_sink_not_confirmed');
  });
});
