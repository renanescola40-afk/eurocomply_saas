import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';
import { locales } from '@/lib/i18n/routing';
import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const taskPage = source('src/app/[locale]/dashboard/organizations/tasks/page.tsx');
const taskList = source('src/components/dashboard/compliance-task-list.tsx');
const documentPage = source('src/app/[locale]/dashboard/organizations/documents/page.tsx');
const teamPage = source('src/app/[locale]/dashboard/organizations/team/page.tsx');
const teamSettings = source('src/components/team/team-settings-section.tsx');
const inviteMemberForm = source('src/components/team/invite-member-form.tsx');
const aiSystemsPage = source('src/app/[locale]/ai-systems/page.tsx');
const aiReadonlyView = source('src/app/[locale]/ai-systems/ai-systems-readonly-view.tsx');
const aiSystemDetail = source('src/app/[locale]/ai-systems/[id]/page.tsx');
const inviteRoute = source('src/app/api/team/invites/route.ts');
const onboardingAction = source('src/server/actions/onboarding.ts');
const activationClient = source('src/app/[locale]/checkout/complete/checkout-activation-client.tsx');
const activationRoute = source('src/app/api/billing/checkout/activation/route.ts');
const checkoutPage = source('src/app/[locale]/checkout/page.tsx');

describe('final commercial UX closure contracts', () => {
  it('keeps recurring task and document workflows localized for every supported locale', () => {
    for (const locale of locales) {
      const copy = getCoreWorkflowCopy(locale);
      expect(copy.tasks.title.length).toBeGreaterThan(4);
      expect(copy.tasks.create.length).toBeGreaterThan(3);
      expect(copy.tasks.deleteConfirm('QA')).toContain('QA');
      expect(copy.documents.title.length).toBeGreaterThan(4);
      expect(copy.documents.upload.length).toBeGreaterThan(3);
      expect(copy.documents.deleteConfirm('QA')).toContain('QA');
    }

    expect(taskPage).toContain('getCoreWorkflowCopy(params.locale).tasks');
    expect(taskPage).toContain('<CreateComplianceTaskForm locale={params.locale}');
    expect(taskPage).toContain('<ComplianceTaskList');
    expect(taskPage).toContain('onEdit={canManageTasks ? handleEditTask : undefined}');
    expect(taskList).toContain('EditComplianceTaskInput');
    expect(taskList).toContain('data-task-id={task.id}');
    expect(documentPage).toContain('getCoreWorkflowCopy(params.locale).documents');
    expect(documentPage).toContain('<CreateDocumentForm locale={params.locale}');
    expect(documentPage).toContain('<DocumentDownloadButton locale={params.locale}');
    expect(documentPage).toContain('canManageDocuments ? <DocumentDeleteButton');
  });

  it('keeps mutation presentation aligned with the canonical role permission matrix', () => {
    expect(taskPage).toContain("roleHasPermission(organization.role, 'manage_ai_governance')");
    expect(taskPage).toContain('canManageTasks ? (');
    expect(documentPage).toContain("roleHasPermission(currentOrganization.role, 'manage_documents')");
    expect(documentPage).toContain('canManageDocuments ? (');
    expect(teamPage).toContain("roleHasPermission(organization.role, 'manage_team')");
    expect(teamPage).toContain('if (!canManageTeam)');
    expect(teamPage.indexOf('if (!canManageTeam)')).toBeLessThan(teamPage.indexOf('const [members, invitations, billing, entitlements]'));
    expect(teamSettings).toContain('canManageTeam: boolean');
    expect(teamSettings).toContain('onRemoveMember={canManageTeam ? handleRemoveMember : undefined}');

    expect(aiSystemsPage).toContain("roleHasPermission(organization.role, 'manage_ai_governance')");
    expect(aiSystemsPage).toContain('canManageAiGovernance ? (');
    expect(aiSystemsPage).toContain('<AiSystemsReadonlyView');
    expect(aiReadonlyView).not.toContain('onSubmit=');
    expect(aiReadonlyView).not.toContain('<form');
    expect(aiSystemDetail).toContain("roleHasPermission(currentMembership?.role, 'manage_ai_governance')");
    expect(aiSystemDetail).toContain('canManageAiGovernance ? (');
    expect(aiSystemDetail).toContain('<AiSystemEditForm');
  });

  it('keeps invitation role labels aligned with roles the API actually persists', () => {
    expect(inviteMemberForm).toContain("const roles = ['admin', 'editor', 'viewer'] as const");
    expect(inviteMemberForm).toContain('canInviteAdmin: boolean');
    expect(inviteMemberForm).toContain('{canInviteAdmin ? <SelectItem value="admin">{copy.admin}</SelectItem> : null}');
    expect(inviteMemberForm).toContain('<SelectItem value="editor">{copy.editor}</SelectItem>');
    expect(inviteMemberForm).toContain('<SelectItem value="viewer">{copy.viewer}</SelectItem>');
    expect(inviteMemberForm).not.toContain('value="member"');
    expect(teamSettings).toContain("if (role === 'admin') return 'Admin'");
    expect(teamSettings).toContain("if (role === 'editor') return 'Editor'");
    expect(teamSettings).toContain("return 'Visualizador'");
  });

  it('keeps roster recovery available when invitation entitlement or seat capacity is locked', () => {
    expect(teamPage).toContain('getOrganizationEntitlements(organization.id)');
    expect(teamPage).toContain("isWithinPlanLimit(billing.plan, 'users', billing.usage.users)");
    expect(teamPage).toContain('const canInviteMembers = entitlements.employeeInvites && withinSeatCapacity');
    expect(teamPage).toContain("const canInviteAdmin = isPlanAtLeast(entitlements.plan, 'enterprise')");
    expect(teamPage).not.toContain('<PlanGate');
    expect(teamSettings).toContain('canInviteMembers: boolean');
    expect(teamSettings).toContain('canInviteAdmin: boolean');
    expect(teamSettings).toContain("type InviteBlockReason = 'plan' | 'capacity' | null");
    expect(teamSettings).toContain('<TeamManagementCard');
    expect(teamSettings).toContain('canInviteMembers ? (');
  });

  it('keeps team and onboarding invitation locale explicit through email rendering', () => {
    for (const locale of locales) {
      const copy = getTeamWorkflowCopy(locale);
      expect(copy.invite.send).toBeTruthy();
      expect(copy.invite.editor).toBeTruthy();
      expect(copy.invite.viewer).toBeTruthy();
      expect(copy.email.cta).toBeTruthy();
      expect(copy.email.subject('QA Org')).toContain('QA Org');
    }

    expect(teamPage).toContain('<TeamSettingsSection');
    expect(teamSettings).toContain('locale: string');
    expect(teamSettings).toContain("payload: { email: string; role: string; locale: string }");
    expect(inviteRoute).toContain("locale: z.enum(['en', 'pt', 'es', 'fr', 'it', 'de']).default('en')");
    expect(inviteRoute).toContain('`${getAppUrl()}/${locale}/invite/');
    expect(inviteRoute).toContain('localizedInvitationEmail');
    expect(inviteRoute).not.toContain('`${getAppUrl()}/en/invite/');

    expect(onboardingAction).toContain('localizedInvitationEmail');
    expect(onboardingAction).toContain('const inviteUrl = `${getAppUrl()}/${locale}/invite/');
    expect(onboardingAction).toContain('locale,');
    expect(onboardingAction).not.toContain("import { invitationEmail } from '@/lib/email/templates'");
  });

  it('preserves the selected self-serve plan when checkout needs onboarding first', () => {
    expect(checkoutPage).toContain('const onboardingPath = `/${locale}/onboarding?plan=${encodeURIComponent(selectedPlan.id)}`');
    expect(checkoutPage).toContain('<Link href={onboardingPath}');
    expect(checkoutPage).not.toContain('/onboarding?next=${encodeURIComponent(checkoutContinuationPath)}');
  });

  it('keeps checkout completion browser UX subordinate to processed live Stripe authority', () => {
    expect(activationRoute).toContain("const ACTIVATED_SUBSCRIPTION_STATUSES = new Set(['active']);");
    expect(activationRoute).not.toContain("new Set(['active', 'trialing'])");
    expect(activationRoute).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(activationRoute).toContain('stripe_customer_id');
    expect(activationRoute).toContain('stripe_subscription_id');
    expect(activationRoute).toContain("authority: 'processed_live_stripe_subscription_event'");
    expect(activationRoute).not.toContain("authority: 'persisted_subscription'");
    expect(activationClient).toContain("fetch('/api/billing/checkout/activation'");
    expect(activationClient).toContain("if (data.state === 'activated')");
    expect(activationClient).toContain("window.location.replace(`/${locale}${data.next ?? '/dashboard/organizations'}`)");
    expect(activationClient).not.toContain('checkout=success');
  });

  it('keeps failed-payment presentation distinct from healthy subscription UX', () => {
    expect(checkoutPage).toContain("const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])");
    expect(checkoutPage).toContain("const PAYMENT_RECOVERY_STATUSES = new Set(['past_due', 'unpaid', 'incomplete'])");
    expect(checkoutPage).toContain('needsPaymentRecovery');
    expect(checkoutPage).toContain('action="portal"');
  });
});