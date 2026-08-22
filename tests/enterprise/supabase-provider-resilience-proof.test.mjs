import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  deriveSupabaseProjectRef,
  evaluateSupabaseProviderResilience,
} from '../../scripts/security/check-supabase-provider-resilience.mjs';

const workflow = readFileSync('.github/workflows/production-provider-runtime-proof.yml', 'utf8');
const producer = readFileSync('scripts/security/check-supabase-provider-resilience.mjs', 'utf8');

const projectRef = 'abcdefghijklmnopqrst';
const project = {
  ref: projectRef,
  organization_slug: 'example-org-slug',
  status: 'ACTIVE_HEALTHY',
};

function evaluate({ plan = 'pro', walg = true, pitr = false, backups = [], hibp = true, authConfig = undefined } = {}) {
  return evaluateSupabaseProviderResilience({
    projectRef,
    projects: [project],
    organization: { plan },
    backups: {
      walg_enabled: walg,
      pitr_enabled: pitr,
      backups,
    },
    authConfig: authConfig ?? { password_hibp_enabled: hibp },
  });
}

test('derives only a canonical standard Supabase project ref', () => {
  assert.equal(deriveSupabaseProjectRef(`https://${projectRef}.supabase.co`), projectRef);
  assert.equal(deriveSupabaseProjectRef(`https://${projectRef}.supabase.co/`), projectRef);
  assert.equal(deriveSupabaseProjectRef(`http://${projectRef}.supabase.co`), null);
  assert.equal(deriveSupabaseProjectRef(`https://${projectRef}.supabase.co/rest/v1`), null);
  assert.equal(deriveSupabaseProjectRef('https://custom.example.com'), null);
});

test('blocks a free Supabase organization even when the project and backup endpoint are healthy', () => {
  const result = evaluate({ plan: 'free', walg: true });
  assert.equal(result.checks.projectHealthy, true);
  assert.equal(result.checks.productionEligiblePlan, false);
  assert.ok(result.blockerCodes.includes('supabase_plan_not_production_eligible'));
});

test('accepts a production-eligible plan with provider-managed backup capability and leaked-password protection enabled', () => {
  const result = evaluate({ plan: 'pro', walg: true, pitr: false, hibp: true });
  assert.equal(result.checks.productionEligiblePlan, true);
  assert.equal(result.checks.managedBackupObserved, true);
  assert.equal(result.checks.pitrStateObserved, true);
  assert.equal(result.checks.leakedPasswordProtectionStateObserved, true);
  assert.equal(result.checks.leakedPasswordProtectionEnabled, true);
  assert.equal(result.metrics.pitrEnabled, false);
  assert.deepEqual(result.blockerCodes, []);
});

test('accepts an observed completed managed backup even when walg flag is false', () => {
  const result = evaluate({
    plan: 'team',
    walg: false,
    backups: [{ status: 'COMPLETED', id: 123 }],
  });
  assert.equal(result.checks.managedBackupObserved, true);
  assert.equal(result.metrics.completedManagedBackupsObserved, 1);
  assert.deepEqual(result.blockerCodes, []);
});

test('blocks a paid plan when no provider-managed backup is observed', () => {
  const result = evaluate({ plan: 'enterprise', walg: false, backups: [] });
  assert.equal(result.checks.productionEligiblePlan, true);
  assert.equal(result.checks.managedBackupObserved, false);
  assert.ok(result.blockerCodes.includes('supabase_managed_backup_not_observed'));
});

test('blocks a production-eligible plan when leaked-password protection is disabled', () => {
  const result = evaluate({ plan: 'pro', walg: true, hibp: false });
  assert.equal(result.checks.productionEligiblePlan, true);
  assert.equal(result.checks.leakedPasswordProtectionStateObserved, true);
  assert.equal(result.checks.leakedPasswordProtectionEnabled, false);
  assert.ok(result.blockerCodes.includes('supabase_leaked_password_protection_disabled'));
});

test('fails closed when the Management API does not expose leaked-password protection state', () => {
  const result = evaluate({ plan: 'enterprise', walg: true, authConfig: {} });
  assert.equal(result.checks.leakedPasswordProtectionStateObserved, false);
  assert.equal(result.checks.leakedPasswordProtectionEnabled, false);
  assert.ok(result.blockerCodes.includes('supabase_leaked_password_protection_state_missing'));
  assert.ok(!result.blockerCodes.includes('supabase_leaked_password_protection_disabled'));
});

test('production provider workflow binds the strict Supabase resilience proof to the protected secret only', () => {
  assert.match(workflow, /Execute strict Supabase provider resilience proof/);
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /node scripts\/security\/check-supabase-provider-resilience\.mjs/);
  assert.match(workflow, /release-validation\/supabase-provider-resilience\.json/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN:[^\n]*vars\./);
});

test('strict proof uses Management API plan, backup and Auth security authority without persisting provider identities', () => {
  assert.match(producer, /\/v1\/projects/);
  assert.match(producer, /\/v1\/organizations\//);
  assert.match(producer, /\/database\/backups/);
  assert.match(producer, /\/config\/auth/);
  assert.match(producer, /password_hibp_enabled/);
  assert.match(producer, /PRODUCTION_ELIGIBLE_PLANS/);
  assert.match(producer, /supabase_plan_not_production_eligible/);
  assert.match(producer, /supabase_managed_backup_not_observed/);
  assert.match(producer, /supabase_leaked_password_protection_disabled/);
  assert.match(producer, /projectRefStored: false/);
  assert.match(producer, /organizationSlugStored: false/);
  assert.match(producer, /organizationPlanStored: false/);
  assert.match(producer, /authConfigStored: false/);
  assert.match(producer, /providerResponseBodiesStored: false/);
});
