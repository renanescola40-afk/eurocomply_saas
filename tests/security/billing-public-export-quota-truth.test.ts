import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicCatalog = readFileSync('src/app/api/billing/catalog/route.ts', 'utf8');
const serverCatalog = readFileSync('src/server/billing/plans.ts', 'utf8');
const subscriptionRoute = readFileSync('src/app/api/billing/subscription/route.ts', 'utf8');
const trialReminderRoute = readFileSync('src/app/api/internal/trial-reminders/route.ts', 'utf8');

describe('public billing commercial truth', () => {
  it('keeps export-count capacity internal until monthly usage authority exists', () => {
    expect(serverCatalog).toContain("exports: number | 'unlimited'");
    expect(publicCatalog).toContain('getPublicPlanEntitlements(plan)');
    expect(publicCatalog).not.toContain('entitlements: plan.entitlements');
    expect(publicCatalog).not.toContain('exports: plan.entitlements.exports');
  });

  it('does not advertise annual self-service pricing while lifecycle rejects annual billing', () => {
    expect(serverCatalog).toContain('annualPriceCents: number | null');
    expect(subscriptionRoute).toContain("error: 'annual_billing_not_available'");
    expect(publicCatalog).toContain('annualPriceCents: null');
    expect(publicCatalog).not.toContain('annualPriceCents: plan.annualPriceCents');
  });

  it('keeps legacy trial reminders authenticated but fail-closed while public trials are unavailable', () => {
    const authorization = trialReminderRoute.indexOf('if (!isAuthorizedInternalCronRequest(request))');
    const disabledGuard = trialReminderRoute.indexOf('if (!PUBLIC_TRIALS_ENABLED)');
    const reminderExecution = trialReminderRoute.indexOf('const reminders = await sendTrialReminders();');

    expect(trialReminderRoute).toContain('const PUBLIC_TRIALS_ENABLED = false;');
    expect(trialReminderRoute).toContain("disabled: 'public_trials_not_offered'");
    expect(authorization).toBeGreaterThan(-1);
    expect(disabledGuard).toBeGreaterThan(authorization);
    expect(reminderExecution).toBeGreaterThan(disabledGuard);
  });

  it('continues publishing currently enforced plan facts', () => {
    expect(publicCatalog).toContain('users: plan.entitlements.users');
    expect(publicCatalog).toContain('documents: plan.entitlements.documents');
    expect(publicCatalog).toContain('auditLogsDays: plan.entitlements.auditLogsDays');
    expect(publicCatalog).toContain('vendorRisk: plan.entitlements.vendorRisk');
  });
});
