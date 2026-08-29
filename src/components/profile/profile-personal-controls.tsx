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
      <section className="rounded-2xl border border-white/[0.075] bg-[#0d1522] p-5" role="status" aria-live="polite">
        <p className="text-sm text-white/48">{copy.loading}</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-5" role="alert">
        <h2 className="text-base font-semibold text-amber-50">{copy.unavailableTitle}</h2>
        <p className="mt-1.5 text-sm text-amber-50/65">{copy.unavailableBody}</p>
      </section>
    );
  }

  const inputClass = 'w-full rounded-xl border border-white/[0.09] bg-black/20 px-3 py-2.5 text-sm text-white/82 outline-none transition placeholder:text-white/25 focus:border-blue-400/45 focus-visible:ring-2 focus-visible:ring-blue-400/55';
  const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-medium text-white/62 transition hover:border-blue-400/20 hover:bg-blue-500/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/55';
  const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section className="space-y-5" aria-label={copy.title}>
      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.tone === 'success'
              ? 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-50'
              : message.tone === 'error'
                ? 'border-red-300/20 bg-red-300/[0.07] text-red-50'
                : 'border-blue-300/15 bg-blue-500/[0.06] text-blue-50/80'
          }`}
          role={message.tone === 'error' ? 'alert' : 'status'}
          aria-live={message.tone === 'error' ? 'assertive' : 'polite'}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0d1522]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><UserRound className="h-4 w-4" aria-hidden="true" /></div>
            <div>
              <h2 className="text-sm font-semibold text-white/88">{copy.personalTitle}</h2>
              <p className="mt-0.5 text-xs text-white/36">{copy.personalBody}</p>
            </div>
          </div>

          <div className="grid gap-4 p-5">
            <div>
              <label htmlFor="profile-email" className="mb-1.5 block text-xs font-medium text-white/48">{copy.emailLabel}</label>
              <input id="profile-email" type="email" value={primaryEmail} disabled className={`${inputClass} disabled:cursor-not-allowed disabled:text-white/45`} />
            </div>

            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-xs font-medium text-white/48">{copy.nameLabel}</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="profile-name" type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={`min-w-0 flex-1 ${inputClass}`} placeholder={copy.namePlaceholder} />
                <button type="button" onClick={updateName} disabled={savingName} className={primaryButton}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {savingName ? copy.saving : copy.save}
                </button>
              </div>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0d1522]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><Languages className="h-4 w-4" aria-hidden="true" /></div>
            <div>
              <h2 className="text-sm font-semibold text-white/88">{copy.languageTitle}</h2>
              <p className="mt-0.5 text-xs text-white/36">{copy.languageBody}</p>
            </div>
          </div>

          <div className="p-5">
            <label htmlFor="preferred-language" className="mb-1.5 block text-xs font-medium text-white/48">{copy.languageLabel}</label>
            <select id="preferred-language" value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value as Locale)} className={inputClass}>
              {locales.map((language) => (
                <option key={language} value={language}>{LOCALE_META[language].nativeName}</option>
              ))}
            </select>
            <button type="button" onClick={updateLanguage} disabled={savingLanguage || selectedLanguage === savedLanguage} className={`${secondaryButton} mt-3 disabled:cursor-not-allowed disabled:opacity-40`}>
              <Languages className="h-4 w-4 text-blue-300" aria-hidden="true" />
              {savingLanguage ? copy.languageSaving : copy.languageSave}
            </button>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0d1522]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></div>
            <div>
              <h2 className="text-sm font-semibold text-white/88">{copy.securityTitle}</h2>
              <p className="mt-0.5 text-xs text-white/36">{copy.securityBody}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-5 sm:flex-row">
            <button type="button" onClick={handleResetPassword} className={secondaryButton}><KeyRound className="h-4 w-4 text-blue-300" aria-hidden="true" />{copy.resetPassword}</button>
            <button type="button" onClick={handleSignOut} className={secondaryButton}><LogOut className="h-4 w-4 text-blue-300" aria-hidden="true" />{copy.signOut}</button>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0d1522]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><Download className="h-4 w-4" aria-hidden="true" /></div>
            <div>
              <h2 className="text-sm font-semibold text-white/88">{copy.exportTitle}</h2>
              <p className="mt-0.5 text-xs text-white/36">{copy.exportBody}</p>
            </div>
          </div>
          <div className="p-5">
            <button type="button" onClick={exportData} className={primaryButton}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {copy.exportAction}
            </button>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-5">
        <h2 className="text-sm font-semibold text-red-50/90">{copy.dangerTitle}</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-red-50/55">{copy.dangerBody}</p>
        <Link href={`/${locale}/support`} className="mt-3 inline-flex rounded-lg border border-red-300/20 px-3 py-2 text-xs font-medium text-red-50/75 transition hover:bg-red-300/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50">{copy.supportAction}</Link>
      </article>
    </section>
  );
}
