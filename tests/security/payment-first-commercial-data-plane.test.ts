import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260823123000_payment_first_commercial_data_plane.sql'),
  'utf8',
);
const onboardingAction = fs.readFileSync(path.join(root, 'src/server/actions/onboarding.ts'), 'utf8');
const onboardingPage = fs.readFileSync(path.join(root, 'src/app/[locale]/onboarding/page.tsx'), 'utf8');
const permissionBridge = fs.readFileSync(path.join(root, 'src/server/auth/permissions.ts'), 'utf8');
const legacyInventory = [
  'src/app/[locale]/dashboard/inventario/page.tsx',
  'src/app/[locale]/dashboard/inventario/novo/page.tsx',
  'src/app/[locale]/dashboard/inventario/[id]/page.tsx',
].map((file) => fs.readFileSync(path.join(root, file), 'utf8'));

describe('payment-first commercial closure', () => {
  it('mirrors the canonical durable commercial sources in a private fail-closed RLS helper', () => {
    expect(migration).toContain('app_private.has_commercial_authority');
    expect(migration).toContain("source.source_kind = 'signed_contract'");
    expect(migration).toContain("snapshot.status = 'applied'");
    expect(migration).toContain("event.livemode = true");
    expect(migration).toContain("event.status = 'processed'");
    expect(migration).toContain("'customer.subscription.created', 'customer.subscription.updated'");
    expect(migration).toContain("event.payload #>> '{data,object,id}' = subscription.stripe_subscription_id");
    expect(migration).toContain('end = subscription.stripe_customer_id');
    expect(migration).not.toContain("source_kind = 'manual_override'");
  });

  it('adds one restrictive paid-authority policy to every organization-scoped product table', () => {
    expect(migration).toContain('as restrictive for all to authenticated');
    expect(migration).toContain('using (app_private.has_commercial_authority(organization_id))');
    expect(migration).toContain('with check (app_private.has_commercial_authority(organization_id))');

    for (const table of [
      'ai_systems',
      'ai_assessments',
      'ai_incidents',
      'documents',
      'risks',
      'vendors',
      'tasks',
      'compliance_tasks',
      'evidence_items',
      'onboarding_activation_runs',
      'monitoring_preferences',
      'notifications',
      'audit_events',
      'audit_logs',
      'invitations',
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
  });

  it('removes billing-unaware legacy/global direct product grants', () => {
    expect(migration).toContain("array['ai_tools', 'compliance_documents']");
    expect(migration).toContain('revoke all on table public.%I from public, anon, authenticated');
    expect(migration).toContain('revoke all on table public.regulatory_updates from public, anon, authenticated');
    expect(migration).toContain("raise exception 'legacy/global paid-product client grants survived: %'");
  });

  it('blocks operational onboarding before AI/docs/tasks/invites are prepared or persisted', () => {
    const activation = onboardingAction.slice(onboardingAction.indexOf('export async function completeOnboardingActivation'));
    const authority = activation.indexOf('await requireLicensedOnboardingAuthority(organizationId)');

    expect(authority).toBeGreaterThanOrEqual(0);
    for (const laterOperation of [
      'const classification = classifyAiSystem',
      'getRecommendedDocuments({',
      'getSuggestedTasks({',
      'supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC',
      'await deliverOnboardingInvitations',
    ]) {
      expect(activation.indexOf(laterOperation), laterOperation).toBeGreaterThan(authority);
    }

    expect(onboardingPage).toContain('requireLicensedOnboardingPageAccess');
    expect(onboardingPage).toContain("onboarding: 'payment_required'");
  });

  it('requires licensed Starter authority for team Server Actions while preserving the billing purchase lane', () => {
    expect(permissionBridge).toContain("manage_team: 'starter'");
    expect(permissionBridge).toContain('minimumPlan: SERVER_ACTION_MINIMUM_PLAN_BY_PERMISSION[requiredPermission]');
    expect(permissionBridge).not.toContain("manage_billing: 'starter'");
    expect(permissionBridge).not.toContain("manage_settings: 'starter'");
  });

  it('removes browser Supabase CRUD from localized legacy inventory routes', () => {
    for (const source of legacyInventory) {
      expect(source).toContain("redirect(`/${locale}/ai-systems`)");
      expect(source).not.toContain("integrations/supabase/client");
      expect(source).not.toContain(".from('ai_tools')");
    }
  });
});
