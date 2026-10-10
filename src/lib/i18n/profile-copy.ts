import type { Locale } from '@/lib/i18n/routing';

export type ProfileCopy = {
  accountEyebrow: string;
  title: string;
  subtitle: string;
  loading: string;
  unavailableTitle: string;
  unavailableBody: string;
  personalTitle: string;
  personalBody: string;
  emailLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  save: string;
  saving: string;
  invalidName: string;
  nameSaved: string;
  nameSaveError: string;
  languageTitle: string;
  languageBody: string;
  languageLabel: string;
  languageSave: string;
  languageSaving: string;
  languageSaved: string;
  languageSaveError: string;
  securityTitle: string;
  securityBody: string;
  resetPassword: string;
  signOut: string;
  resetEmailMissing: string;
  resetEmailError: string;
  resetEmailSent: string;
  exportTitle: string;
  exportBody: string;
  exportAction: string;
  exportSuccess: string;
  dangerTitle: string;
  dangerBody: string;
  supportAction: string;
};

const en: ProfileCopy = {
  accountEyebrow: 'Account',
  title: 'My profile',
  subtitle: 'Manage your sign-in details, language preference and basic data portability.',
  loading: 'Loading profile…',
  unavailableTitle: 'Profile unavailable',
  unavailableBody: 'Sign in again to manage your account.',
  personalTitle: 'Personal information',
  personalBody: 'These details come from your active account.',
  emailLabel: 'Email',
  nameLabel: 'Name',
  namePlaceholder: 'Your name',
  save: 'Save',
  saving: 'Saving…',
  invalidName: 'Enter a valid name.',
  nameSaved: 'Name updated successfully.',
  nameSaveError: 'We could not update your name right now.',
  languageTitle: 'Communication language',
  languageBody: 'Choose the language Risck Comply should use for account and operational email presentation when the sender supports recipient preferences.',
  languageLabel: 'Preferred language',
  languageSave: 'Save language',
  languageSaving: 'Saving language…',
  languageSaved: 'Communication language updated.',
  languageSaveError: 'We could not update your communication language right now.',
  securityTitle: 'Account security',
  securityBody: 'Send a password recovery email or end the current session.',
  resetPassword: 'Send password recovery',
  signOut: 'Sign out',
  resetEmailMissing: 'Email is unavailable for password recovery.',
  resetEmailError: 'We could not send the recovery email right now.',
  resetEmailSent: 'Recovery email sent.',
  exportTitle: 'Export my data',
  exportBody: 'Download a copy of your basic account data in JSON format.',
  exportAction: 'Export data',
  exportSuccess: 'Data exported successfully.',
  dangerTitle: 'Danger zone',
  dangerBody: 'For account deletion, contact support. This action requires secure confirmation.',
  supportAction: 'Contact support',
};

export const profileCopyByLocale: Record<Locale, ProfileCopy> = {
  en,
  pt: en,
  es: en,
  fr: en,
  it: en,
  de: en,
};
