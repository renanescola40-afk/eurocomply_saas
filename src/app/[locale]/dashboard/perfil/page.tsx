'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

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
  const { user, loading, signOut, resetPassword } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const metadata = user?.user_metadata ?? {};
  const primaryEmail = user?.email ?? '';
  const metadataFullName = typeof metadata.full_name === 'string'
    ? metadata.full_name
    : typeof metadata.name === 'string'
      ? metadata.name
      : '';
  const fullName = user?.fullName ?? metadataFullName;

  const profileData = useMemo(() => ({
    id: user?.id ?? null,
    email: primaryEmail || null,
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    fullName: fullName || null,
    imageUrl: user?.imageUrl ?? null,
    createdAt: user?.created_at ?? null,
    updatedAt: user?.updated_at ?? null,
    userMetadata: metadata,
  }), [fullName, metadata, primaryEmail, user]);

  useEffect(() => {
    if (loading || !user) return;
    setDisplayName(fullName || '');
  }, [fullName, loading, user]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function updateName() {
    if (!user) return;

    const normalizedName = displayName.trim();
    if (!normalizedName) {
      setMessage({ tone: 'error', text: 'Digite um nome válido.' });
      return;
    }

    const { firstName, lastName } = splitDisplayName(normalizedName);
    setSaving(true);

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
      setMessage({ tone: 'success', text: 'Nome atualizado com sucesso.' });
    } catch {
      setMessage({ tone: 'error', text: 'Não foi possível atualizar o nome agora.' });
    } finally {
      setSaving(false);
    }
  }

  function exportData() {
    downloadJson('risck-comply-profile-data.json', profileData);
    setMessage({ tone: 'success', text: 'Dados exportados com sucesso.' });
  }

  async function handleResetPassword() {
    if (!primaryEmail) {
      setMessage({ tone: 'error', text: 'Email indisponível para recuperação de senha.' });
      return;
    }

    const { error } = await resetPassword(primaryEmail);
    setMessage(error
      ? { tone: 'error', text: 'Não foi possível enviar o email de recuperação agora.' }
      : { tone: 'success', text: 'Email de recuperação enviado.' });
  }

  async function handleSignOut() {
    await signOut();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-500">Carregando perfil...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-950">Perfil indisponível</h1>
        <p className="mt-3 text-sm text-slate-600">Entre novamente para gerir a sua conta.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Conta</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Meu perfil</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gerencie os seus dados de acesso, preferências básicas e direitos de portabilidade.
        </p>
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
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Informações pessoais</h2>
          <p className="mt-1 text-sm text-slate-600">Estes dados vêm da conta ativa do usuário.</p>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={primaryEmail}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Seu nome"
                />
                <button
                  type="button"
                  onClick={updateName}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Segurança da conta</h2>
          <p className="mt-1 text-sm text-slate-600">
            Envie um email de recuperação de senha ou termine a sessão atual.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleResetPassword}
              className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-800"
            >
              Enviar recuperação de senha
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Terminar sessão
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-blue-950">Exportar meus dados</h2>
          <p className="mt-1 text-sm text-blue-700">
            Baixe uma cópia dos dados básicos da sua conta em formato JSON.
          </p>
          <button
            type="button"
            onClick={exportData}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            Exportar dados
          </button>
        </section>

        <section className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-950">Zona de perigo</h2>
          <p className="mt-1 text-sm text-red-700">
            Para exclusão de conta, contacte o suporte. Esta ação deve passar por confirmação segura.
          </p>
          <a
            href={`/${locale}/support`}
            className="mt-5 inline-flex rounded-lg bg-red-600 px-5 py-2 font-medium text-white transition hover:bg-red-700"
          >
            Contactar suporte
          </a>
        </section>
      </div>
    </div>
  );
}
