import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  billingStartedEmail,
  complianceDeadlineReminderEmail,
  documentExpiringEmail,
  exportReadyEmail,
  invoiceFailedEmail,
  memberInvitedEmail,
  organizationCreatedEmail,
  securityAlertEmail,
  trialUpgradeEmail,
  vendorReviewEmail,
  welcomeOnboardingEmail,
} from '@/lib/email/templates';
import { profileCopyByLocale } from '@/lib/i18n/profile-copy';
import {
  getRecipientLocaleFromMetadata,
  RECIPIENT_LOCALE_FALLBACK,
  RECIPIENT_LOCALE_METADATA_KEY,
  resolveRecipientLocale,
  withRecipientLocaleMetadata,
} from '@/lib/i18n/recipient-locale';
import { locales } from '@/lib/i18n/routing';

const canonicalProfilePage = readFileSync(join(process.cwd(), 'src/app/[locale]/profile/page.tsx'), 'utf8');
const profileControls = readFileSync(join(process.cwd(), 'src/components/profile/profile-personal-controls.tsx'), 'utf8');
const legacyProfilePage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/perfil/page.tsx'), 'utf8');
const authClient = readFileSync(join(process.cwd(), 'src/hooks/useAuth.tsx'), 'utf8');
const authCallback = readFileSync(join(process.cwd(), 'src/app/auth/callback/route.ts'), 'utf8');
const userEmailResolver = readFileSync(join(process.cwd(), 'src/server/users/email.ts'), 'utf8');
const authQuery = readFileSync(join(process.cwd(), 'src/server/queries/auth.ts'), 'utf8');
const organizationAction = readFileSync(join(process.cwd(), 'src/server/actions/organizations.ts'), 'utf8');
const complianceAlerts = readFileSync(join(process.cwd(), 'src/app/api/internal/compliance-alerts/route.ts'), 'utf8');
const supabaseTypes = readFileSync(join(process.cwd(), 'src/integrations/supabase/types.ts'), 'utf8');
const billingWebhook = readFileSync(join(process.cwd(), 'src/server/billing/stripe-webhooks.ts'), 'utf8');
const trialReminder = readFileSync(join(process.cwd(), 'src/app/api/internal/trial-reminders/route.ts'), 'utf8');

describe('recipient locale authority', () => {
  it('accepts only configured locales and falls back deterministically to English', () => {
    expect(RECIPIENT_LOCALE_METADATA_KEY).toBe('preferred_language');
    expect(RECIPIENT_LOCALE_FALLBACK).toBe('en');

    for (const locale of locales) {
      expect(resolveRecipientLocale(locale)).toBe(locale);
      expect(getRecipientLocaleFromMetadata({ preferred_language: locale })).toBe(locale);
    }

    for (const invalid of [null, undefined, '', 'nl', 'pt-BR', 42, {}, []]) {
      expect(resolveRecipientLocale(invalid)).toBe('en');
    }

    expect(getRecipientLocaleFromMetadata(null)).toBe('en');
    expect(getRecipientLocaleFromMetadata({ preferred_language: 'nl' })).toBe('en');
  });

  it('preserves unrelated auth metadata while writing the explicit language preference', () => {
    const existing = { full_name: 'Example User', analytics_opt_out: true };
    const next = withRecipientLocaleMetadata(existing, 'fr');

    expect(next).toEqual({ ...existing, preferred_language: 'fr' });
    expect(existing).not.toHaveProperty('preferred_language');
  });

  it('seeds the selected UI locale only when creating a new email account', () => {
    expect(authClient).toContain('preferred_language: getRecipientLocaleFromWindow()');
    expect(authClient).toContain('resolveRecipientLocale(getLocaleFromWindow())');
    expect(authCallback).not.toContain('preferred_language');
    expect(authCallback).not.toContain('withRecipientLocaleMetadata');
    expect(authCallback).not.toContain('auth.updateUser');
  });

  it('keeps one discoverable canonical profile surface for account and locale controls', () => {
    expect(canonicalProfilePage).toContain("import { ProfilePersonalControls } from '@/components/profile/profile-personal-controls';");
    expect(canonicalProfilePage).toContain('<ProfilePersonalControls locale={safeLocale} />');
    expect(canonicalProfilePage).toContain('getCurrentOrganizationForUser(user.id)');
    expect(canonicalProfilePage).toContain('canManageDashboardBilling(organization.role)');

    expect(legacyProfilePage).toContain("redirect(`/${safeLocale}/profile`)");
    expect(legacyProfilePage).not.toContain('supabase.auth.updateUser');
  });

  it('persists the preference through Auth metadata instead of a nonexistent profiles column', () => {
    expect(profileControls).toContain('supabase.auth.updateUser');
    expect(profileControls).toContain('withRecipientLocaleMetadata(metadata, selectedLanguage)');
    expect(profileControls).toContain('LOCALE_META[language].nativeName');
    expect(profileControls).not.toMatch(/from\(['"]profiles['"]\)[\s\S]*preferred_language/);
    expect(profileControls).not.toContain("update({ preferred_language");
    expect(supabaseTypes).not.toContain('preferred_language: string | null');
  });

  it('resolves recipient email and locale in one bounded Auth lookup without global user enumeration', () => {
    expect(userEmailResolver).toContain('auth.admin.getUserById(userId)');
    expect(userEmailResolver).toContain('getRecipientLocaleFromMetadata(data.user?.user_metadata)');
    expect(userEmailResolver).toContain('getUserEmailContextById');
    expect(userEmailResolver).not.toContain('listUsers');
  });

  it('propagates the persisted locale through the authenticated current-user boundary', () => {
    expect(authQuery).toContain('locale: Locale');
    expect(authQuery).toContain('locale: getRecipientLocaleFromMetadata(metadata)');
  });

  it('localizes the profile application chrome across every configured locale', () => {
    const english = profileCopyByLocale.en;
    for (const locale of locales) {
      const copy = profileCopyByLocale[locale];
      expect(copy.title).toBeTruthy();
      expect(copy.languageTitle).toBeTruthy();
      expect(copy.languageSave).toBeTruthy();
      expect(copy.resetPassword).toBeTruthy();
      expect(copy.supportAction).toBeTruthy();
      if (locale !== 'en') {
        expect(copy.title).not.toBe(english.title);
        expect(copy.languageTitle).not.toBe(english.languageTitle);
      }
    }
  });

  it('renders every shared transactional template in all configured locales', () => {
    const builders = [
      (locale: string) => welcomeOnboardingEmail({ locale, organizationName: 'ACME GmbH', dashboardUrl: '/dashboard' }),
      (locale: string) => organizationCreatedEmail({ locale, organizationName: 'ACME GmbH', organizationUrl: '/organizations/acme', createdByName: 'Jane Doe' }),
      (locale: string) => memberInvitedEmail({ locale, organizationName: 'ACME GmbH', role: 'Editor', inviteUrl: '/invite/token', invitedByName: 'Jane Doe' }),
      (locale: string) => billingStartedEmail({ locale, organizationName: 'ACME GmbH', planName: 'Professional', billingUrl: '/billing' }),
      (locale: string) => invoiceFailedEmail({ locale, organizationName: 'ACME GmbH', billingUrl: '/billing', amountDue: '€149.00', dueDate: '2026-08-20' }),
      (locale: string) => complianceDeadlineReminderEmail({ locale, organizationName: 'ACME GmbH', deadlineName: 'Article 50 review', dueDate: '2026-09-01', dashboardUrl: '/dashboard' }),
      (locale: string) => exportReadyEmail({ locale, organizationName: 'ACME GmbH', exportName: 'Evidence Pack 7', exportsUrl: '/exports' }),
      (locale: string) => securityAlertEmail({ locale, organizationName: 'ACME GmbH', alertTitle: 'New sign-in', occurredAt: '2026-08-15T12:00:00Z', securityUrl: '/security' }),
      (locale: string) => trialUpgradeEmail({ locale, organizationName: 'ACME GmbH', billingUrl: '/billing', daysRemaining: 2 }),
      (locale: string) => documentExpiringEmail({ locale, organizationName: 'ACME GmbH', documentName: 'Policy-42.pdf', expiresAt: '2026-09-15', documentsUrl: '/documents' }),
      (locale: string) => vendorReviewEmail({ locale, organizationName: 'ACME GmbH', vendorName: 'Vendor-X', vendorsUrl: '/vendors', reviewDueAt: '2026-09-20' }),
    ];

    for (const builder of builders) {
      const english = builder('en');
      for (const locale of locales) {
        const email = builder(locale);
        expect(email.subject).toBeTruthy();
        expect(email.html).toContain(`lang="${locale}"`);
        expect(email.text).toBeTruthy();
        if (locale !== 'en') expect(email.subject).not.toBe(english.subject);
      }
    }
  });

  it('preserves dynamic business payload values instead of translating or rewriting them', () => {
    const invitation = memberInvitedEmail({ locale: 'fr', organizationName: 'ACME GmbH', role: 'Editor', inviteUrl: '/invite/token', invitedByName: 'Jane Doe' });
    expect(`${invitation.subject}\n${invitation.html}\n${invitation.text}`).toContain('ACME GmbH');
    expect(`${invitation.subject}\n${invitation.html}\n${invitation.text}`).toContain('Editor');
    expect(`${invitation.subject}\n${invitation.html}\n${invitation.text}`).toContain('Jane Doe');

    const deadline = complianceDeadlineReminderEmail({ locale: 'de', organizationName: 'ACME GmbH', deadlineName: 'Article 50 review', dueDate: '2026-09-01', dashboardUrl: '/dashboard' });
    expect(`${deadline.subject}\n${deadline.html}\n${deadline.text}`).toContain('Article 50 review');
    expect(`${deadline.subject}\n${deadline.html}\n${deadline.text}`).toContain('2026-09-01');

    const vendor = vendorReviewEmail({ locale: 'es', organizationName: 'ACME GmbH', vendorName: 'Vendor-X', vendorsUrl: '/vendors', reviewDueAt: '2026-09-20' });
    expect(`${vendor.subject}\n${vendor.html}\n${vendor.text}`).toContain('Vendor-X');
    expect(`${vendor.subject}\n${vendor.html}\n${vendor.text}`).toContain('2026-09-20');
  });

  it('uses recipient locale for Product-owned organization and compliance email callers', () => {
    expect(organizationAction).toContain('locale: user.locale');
    expect(organizationAction).toContain('`${getAppUrl()}/${user.locale}/dashboard/organizations/billing?onboarding=payment_required`');

    expect(complianceAlerts).toContain('getUserEmailContextById');
    expect(complianceAlerts).toContain('locale: recipient.locale');
    expect(complianceAlerts).toContain('`${appUrl}/${recipient.locale}/dashboard/organizations/documents`');
    expect(complianceAlerts).toContain('`${appUrl}/${recipient.locale}/dashboard/organizations/vendors`');
  });

  it('keeps legacy template callers backward-compatible with English fallback', () => {
    const implicit = invoiceFailedEmail({ organizationName: 'ACME GmbH', billingUrl: '/billing' });
    const explicit = invoiceFailedEmail({ locale: 'en', organizationName: 'ACME GmbH', billingUrl: '/billing' });
    const invalid = invoiceFailedEmail({ locale: 'unsupported', organizationName: 'ACME GmbH', billingUrl: '/billing' });

    expect(implicit).toEqual(explicit);
    expect(invalid).toEqual(explicit);
  });

  it('uses the canonical recipient locale authority for Billing-owned transactional callers', () => {
    expect(billingWebhook).toContain('getUserEmailContextById');
    expect(billingWebhook).toContain("getUserEmailContextById(userId, 'billing_contact_lookup')");
    expect(billingWebhook).toContain('locale: recipient.locale');
    expect(billingWebhook).toContain('`${getAppUrl()}/${recipient.locale}/dashboard/organizations/billing`');
    expect(billingWebhook).toContain('recipientLocale: recipient.locale');

    expect(trialReminder).toContain('getUserEmailContextById');
    expect(trialReminder).toContain("getUserEmailContextById(ownerUserId, 'trial_reminder_owner_lookup')");
    expect(trialReminder).toContain('locale: recipient.locale');
    expect(trialReminder).toContain('`${appUrl}/${recipient.locale}/dashboard/organizations/billing`');
    expect(trialReminder).toContain('recipientLocale: recipient.locale');
  });

  it('frames trial reminders only for already-existing trialing subscriptions', () => {
    const email = trialUpgradeEmail({ locale: 'en', organizationName: 'ACME GmbH', billingUrl: '/billing', daysRemaining: 2 });
    expect(email.subject.toLowerCase()).toContain('trial period');
    expect(email.text.toLowerCase()).toContain('existing');
    expect(trialReminder).toContain(".eq('status', 'trialing')");
  });
});