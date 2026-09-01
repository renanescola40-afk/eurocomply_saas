import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const SETTINGS = new URL('../../src/app/[locale]/settings/organization/page.tsx', import.meta.url);
const PROFILE = new URL('../../src/app/[locale]/profile/page.tsx', import.meta.url);
const PROFILE_CONTROLS = new URL('../../src/components/profile/profile-personal-controls.tsx', import.meta.url);
const NOTIFICATIONS_PAGE = new URL('../../src/app/[locale]/notificacoes/page.tsx', import.meta.url);
const NOTIFICATIONS_CLIENT = new URL('../../src/app/[locale]/notificacoes/notifications-client.tsx', import.meta.url);
const LOGIN = new URL('../../src/app/[locale]/login/page.tsx', import.meta.url);
const ONBOARDING_PAGE = new URL('../../src/app/[locale]/onboarding/page.tsx', import.meta.url);
const ONBOARDING_BOUNDARY = new URL('../../src/components/onboarding/onboarding-runtime-boundary.tsx', import.meta.url);
const ONBOARDING_CSS = new URL('../../src/components/onboarding/onboarding-enterprise-v2.module.css', import.meta.url);

describe('RISCK COMPLY UI V2 account surfaces', () => {
  it('keeps organization settings behind server-side administrative boundaries', async () => {
    const source = await readFile(SETTINGS, 'utf8');

    expect(source).toContain("roleHasPermission(organization.role, 'manage_settings')");
    expect(source).toContain("roleHasPermission(organization.role, 'manage_team')");
    expect(source).toContain('canManageDashboardBilling(organization.role)');
    expect(source).toContain('getOrganizationBillingAuthority(organization.id)');
    expect(source).toContain('<EnterpriseDashboardShell');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('text-blue-300');
    expect(source).not.toContain('text-emerald-300');
  });

  it('keeps personal profile mutations intact while using cobalt as the product accent', async () => {
    const [profile, controls] = await Promise.all([
      readFile(PROFILE, 'utf8'),
      readFile(PROFILE_CONTROLS, 'utf8'),
    ]);

    expect(profile).toContain('<ProfilePersonalControls');
    expect(profile).toContain("roleHasPermission(organization.role, 'manage_team')");
    expect(profile).toContain("roleHasPermission(organization.role, 'manage_settings')");
    expect(profile).toContain('canManageDashboardBilling(organization.role)');
    expect(profile).toContain('bg-[#0d1522]');
    expect(controls).toContain('supabase.auth.updateUser');
    expect(controls).toContain('resetPassword(primaryEmail)');
    expect(controls).toContain('await signOut()');
    expect(controls).toContain('bg-blue-600');
    expect(controls).toContain('focus:border-blue-400/45');
    expect(controls).toContain("message.tone === 'success'");
  });

  it('renders notifications from server-loaded activity without demo counts', async () => {
    const [page, client] = await Promise.all([
      readFile(NOTIFICATIONS_PAGE, 'utf8'),
      readFile(NOTIFICATIONS_CLIENT, 'utf8'),
    ]);

    expect(page).toContain('listNotificationsForUser(user.id)');
    expect(page).toContain('initialNotifications={notifications}');
    expect(client).toContain('toFeedNotifications(initialNotifications)');
    expect(client).toContain('notifications.filter((item) => item.unread).length');
    expect(client).toContain("notifications.filter((item) => item.type === 'alertas').length");
    expect(client).toContain('bg-blue-600');
    expect(client).not.toContain('text-emerald-300');
  });

  it('preserves login redirect hardening and enterprise authentication entry points', async () => {
    const source = await readFile(LOGIN, 'utf8');

    expect(source).toContain('function safeNext(');
    expect(source).toContain("value.startsWith('//')");
    expect(source).toContain("value.includes('://')");
    expect(source).toContain('<EnterpriseSsoLogin');
    expect(source).toContain('signInWithEmail');
    expect(source).toContain('signInWithGoogle');
    expect(source).toContain('router.replace(afterSignInUrl)');
    expect(source).toContain('bg-blue-600');
    expect(source).not.toContain('cyan-300');
  });

  it('keeps payment-first onboarding authority while replacing the legacy green chrome', async () => {
    const [page, boundary, css] = await Promise.all([
      readFile(ONBOARDING_PAGE, 'utf8'),
      readFile(ONBOARDING_BOUNDARY, 'utf8'),
      readFile(ONBOARDING_CSS, 'utf8'),
    ]);

    expect(page).toContain('requireLicensedOnboardingPageAccess');
    expect(page).toContain('getOrganizationBillingAuthority(input.organizationId)');
    expect(page).toContain('redirect(getBillingRecoveryPath');
    expect(page).toContain('completeOnboardingActivation(input, safeLocale)');
    expect(boundary).toContain('data-risck-onboarding-shell="risck-ui-v2"');
    expect(boundary).toContain('getBillingRecoveryPath(locale, input.selectedPlan)');
    expect(boundary).toContain('focus-visible:ring-blue-400/70');
    expect(css).toContain('background: #07101a');
    expect(css).toContain('background: #0d1522');
    expect(css).toContain('background: rgb(37 99 235)');
    expect(css).not.toContain('background: #0b100f');
    expect(css).not.toContain('background: rgb(110 231 183)');
  });
});
