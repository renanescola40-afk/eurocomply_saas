'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, KeyRound, Languages, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { profileCopyByLocale } from '@/lib/i18n/profile-copy';
import {
  getRecipientLocaleFromMetadata,
  withRecipientLocaleMetadata,
} from '@/lib/i18n/recipient-locale';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type MessageState = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;

type ProfilePersonalControlsProps = {
  locale: Locale;
};

function splitDisplayName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function downloadJson(filename: string, data: unknown) {
  const dataBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ProfilePersonalControls({ locale }: ProfilePersonalControlsProps) {
  const router = useRouter();
  const copy = profileCopyByLocale[locale];
  const { user, loading, signOut, resetPassword } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>('en');
  const [savedLanguage, setSavedLanguage] = useState<Locale>('en');
  const [savingName, setSavingName] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const metadata = useMemo<Record<string, unknown>>(() => {
    const value = user?.user_metadata;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }, [user?.user_metadata]);

  const primaryEmail = user?.email ?? '';
  const metadataFullName = typeof metadata.full_name === 'string'
    ? metadata.full_name
    : typeof metadata.name === 'string'
      ? metadata.name
      : '';
  const fullName = user?.fullName ?? metadataFullName;
  const preferredLanguage = getRecipientLocaleFromMetadata(metadata);

  const profileData = useMemo(() => ({
    id: user?.id ?? null,
    email: primaryEmail || null,
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    fullName: fullName || null,
    preferredLanguage: savedLanguage,
    imageUrl: user?.imageUrl ?? null,
    createdAt: user?.created_at ?? null,
    updatedAt: user?.updated_at ?? null,
    userMetadata: metadata,
  }), [fullName, metadata, primaryEmail, savedLanguage, user]);

  useEffect(() => {
    if (loading || !user) return;
    setDisplayName(fullName || '');
    setSelectedLanguage(preferredLanguage);
    setSavedLanguage(preferredLanguage);
  }, [fullName, loading, preferredLanguage, user]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function updateName() {
    if (!user) return;

    const normalizedName = displayName.trim();
    if (!normalizedName) {
      setMessage({ tone: 'error', text: copy.invalidName });
      return;
    }

    const { firstName, lastName } = splitDisplayName(normalizedName);
    setSavingName(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          name: normalizedName,
          full_name: normalizedName,
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (error) throw error;
      setMessage({ tone: 'success', text: copy.nameSaved });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: copy.nameSaveError });
    } finally {
      setSavingName(false);
    }
  }

  async function updateLanguage() {
    if (!user) return;
    setSavingLanguage(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: withRecipientLocaleMetadata(metadata, selectedLanguage),
      });

      if (error) throw error;
      setSavedLanguage(selectedLanguage);
      setMessage({ tone: 'success', text: copy.languageSaved });
    } catch {
      setMessage({ tone: 'error', text: copy.languageSaveError });
    } finally {
      setSavingLanguage(false);
    }
  }

  function exportData() {
    downloadJson('risck-comply-profile-data.json', profileData);
    setMessage({ tone: 'success', text: copy.exportSuccess });
  }

  async function handleResetPassword() {
    if (!primaryEmail) {
      setMessage({ tone: 'error', text: copy.resetEmailMissing });
      return;
    }

    const { error } = await resetPassword(primaryEmail);
    setMessage(error
      ? { tone: 'error', text: copy.resetEmailError }
      : { tone: 'success', text: copy.resetEmailSent });
  }

  async function handleSignOut() {
    await signOut();
  }

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8" role="status" aria-live="polite">
        <p className="text-sm text-white/55">{copy.loading}</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-[2rem] border border-amber-300/20 bg-amber-300/[0.06] p-6 md:p-8" role="alert">
        <h2 className="text-lg font-semibold text-amber-50">{copy.unavailableTitle}</h2>
        <p className="mt-2 text-sm text-amber-50/70">{copy.unavailableBody}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label={copy.title}>
      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.tone === 'success'
              ? 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-50'
              : message.tone === 'error'
                ? 'border-red-300/20 bg-red-300/[0.08] text-red-50'
                : 'border-blue-300/20 bg-blue-300/[0.08] text-blue-50'
          }`}
          role={message.tone === 'error' ? 'alert' : 'status'}
          aria-live={message.tone === 'error' ? 'assertive' : 'polite'}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-blue-200" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{copy.personalTitle}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/50">{copy.personalBody}</p>

          <div className="mt-6 grid gap-5">
            <div>
              <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-white/65">{copy.emailLabel}</label>
              <input
                id="profile-email"
                type="email"
                value={primaryEmail}
                disabled
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white/70 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-white/65">{copy.nameLabel}</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="profile-name"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none transition placeholder:text-white/25 focus:border-blue-300/60 focus-visible:ring-2 focus-visible:ring-blue-400"
                  placeholder={copy.namePlaceholder}
                />
                <button
                  type="button"
                  onClick={updateName}
                  disabled={savingName}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-black transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {savingName ? copy.saving : copy.save}
                </button>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-blue-200" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{copy.languageTitle}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/50">{copy.languageBody}</p>

          <div className="mt-6">
            <label htmlFor="preferred-language" className="mb-2 block text-sm font-medium text-white/65">{copy.languageLabel}</label>
            <select
              id="preferred-language"
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value as Locale)}
              className="w-full rounded-xl border border-white/15 bg-[#0b0f17] px-3 py-2.5 text-white outline-none transition focus:border-blue-300/60 focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {locales.map((language) => (
                <option key={language} value={language}>
                  {LOCALE_META[language].nativeName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={updateLanguage}
              disabled={savingLanguage || selectedLanguage === savedLanguage}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/25 bg-blue-300/[0.10] px-4 py-2.5 font-semibold text-blue-50 transition hover:bg-blue-300/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              {savingLanguage ? copy.languageSaving : copy.languageSave}
            </button>
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-200" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{copy.securityTitle}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/50">{copy.securityBody}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleResetPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 font-medium text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {copy.resetPassword}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 font-medium text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {copy.signOut}
            </button>
          </div>
        </article>

        <article className="rounded-[2rem] border border-blue-300/15 bg-blue-300/[0.05] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-blue-200" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{copy.exportTitle}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/50">{copy.exportBody}</p>
          <button
            type="button"
            onClick={exportData}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {copy.exportAction}
          </button>
        </article>
      </div>

      <article className="rounded-[2rem] border border-red-300/15 bg-red-300/[0.045] p-6 md:p-8">
        <h2 className="text-xl font-semibold text-red-50">{copy.dangerTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-red-50/60">{copy.dangerBody}</p>
        <Link
          href={`/${locale}/support`}
          className="mt-5 inline-flex rounded-xl border border-red-300/25 bg-red-300/[0.08] px-4 py-2.5 font-medium text-red-50 transition hover:bg-red-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          {copy.supportAction}
        </Link>
      </article>
    </section>
  );
}
