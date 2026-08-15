'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { profileCopyByLocale } from '@/lib/i18n/profile-copy';
import {
  getRecipientLocaleFromMetadata,
  withRecipientLocaleMetadata,
} from '@/lib/i18n/recipient-locale';
import { defaultLocale, LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type MessageState = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;

function getLocale(rawLocale: unknown): Locale {
  return typeof rawLocale === 'string' && locales.includes(rawLocale as Locale)
    ? rawLocale as Locale
    : defaultLocale;
}

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

export default function PerfilPage() {
  const params = useParams<{ locale?: string }>();
  const locale = getLocale(params?.locale);
  const copy = profileCopyByLocale[locale];
  const { user, loading, signOut, resetPassword } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>('en');
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
    preferredLanguage,
    imageUrl: user?.imageUrl ?? null,
    createdAt: user?.created_at ?? null,
    updatedAt: user?.updated_at ?? null,
    userMetadata: metadata,
  }), [fullName, metadata, preferredLanguage, primaryEmail, user]);

  useEffect(() => {
    if (loading || !user) return;
    setDisplayName(fullName || '');
    setSelectedLanguage(preferredLanguage);
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
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <div className="text-sm text-slate-500">{copy.loading}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-950">{copy.unavailableTitle}</h1>
        <p className="mt-3 text-sm text-slate-600">{copy.unavailableBody}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{copy.accountEyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            message.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : message.tone === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
          }`}
          role={message.tone === 'error' ? 'alert' : 'status'}
          aria-live={message.tone === 'error' ? 'assertive' : 'polite'}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{copy.personalTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.personalBody}</p>

          <div className="mt-6 grid gap-5">
            <div>
              <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-slate-700">{copy.emailLabel}</label>
              <input
                id="profile-email"
                type="email"
                value={primaryEmail}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-slate-700">{copy.nameLabel}</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="profile-name"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500"
                  placeholder={copy.namePlaceholder}
                />
                <button
                  type="button"
                  onClick={updateName}
                  disabled={savingName}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingName ? copy.saving : copy.save}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{copy.languageTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.languageBody}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="preferred-language" className="mb-1 block text-sm font-medium text-slate-700">{copy.languageLabel}</label>
              <select
                id="preferred-language"
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(getLocale(event.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {locales.map((language) => (
                  <option key={language} value={language}>
                    {LOCALE_META[language].nativeName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={updateLanguage}
              disabled={savingLanguage || selectedLanguage === preferredLanguage}
              className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingLanguage ? copy.languageSaving : copy.languageSave}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{copy.securityTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.securityBody}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleResetPassword}
              className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {copy.resetPassword}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            >
              {copy.signOut}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-blue-950">{copy.exportTitle}</h2>
          <p className="mt-1 text-sm text-blue-700">{copy.exportBody}</p>
          <button
            type="button"
            onClick={exportData}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {copy.exportAction}
          </button>
        </section>

        <section className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-950">{copy.dangerTitle}</h2>
          <p className="mt-1 text-sm text-red-700">{copy.dangerBody}</p>
          <a
            href={`/${locale}/support`}
            className="mt-5 inline-flex rounded-lg bg-red-600 px-5 py-2 font-medium text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            {copy.supportAction}
          </a>
        </section>
      </div>
    </div>
  );
}
