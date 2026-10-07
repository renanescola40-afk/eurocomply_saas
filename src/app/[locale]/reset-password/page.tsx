'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { locales, type Locale } from '@/lib/i18n/routing';

const copy = {
  en: {
    eyebrow: 'SECURE PASSWORD RESET', title: 'Choose a new password', subtitle: 'Your recovery session must be valid before the password can be changed.', password: 'New password', confirm: 'Confirm new password', submit: 'Update password', submitting: 'Updating securely…', successTitle: 'Password updated', success: 'Your password was changed. Sign in again with the new password.', invalid: 'This recovery link is invalid or expired. Request a new link.', mismatch: 'The passwords do not match.', weak: 'Use at least 8 characters.', unavailable: 'The password could not be updated. Request a new recovery link and try again.', request: 'Request a new link', signIn: 'Back to sign in', checking: 'Validating recovery session…',
  },
  pt: {
    eyebrow: 'REDEFINIÇÃO SEGURA DE SENHA', title: 'Escolha uma nova senha', subtitle: 'A sessão de recuperação deve estar válida antes de alterar a senha.', password: 'Nova senha', confirm: 'Confirmar nova senha', submit: 'Atualizar senha', submitting: 'A atualizar com segurança…', successTitle: 'Senha atualizada', success: 'A sua senha foi alterada. Entre novamente com a nova senha.', invalid: 'Este link de recuperação é inválido ou expirou. Solicite um novo link.', mismatch: 'As senhas não coincidem.', weak: 'Use pelo menos 8 caracteres.', unavailable: 'Não foi possível atualizar a senha. Solicite um novo link e tente novamente.', request: 'Solicitar novo link', signIn: 'Voltar ao login', checking: 'A validar a sessão de recuperação…',
  },
  es: {
    eyebrow: 'RESTABLECIMIENTO SEGURO DE CONTRASEÑA', title: 'Elige una nueva contraseña', subtitle: 'La sesión de recuperación debe ser válida antes de cambiar la contraseña.', password: 'Nueva contraseña', confirm: 'Confirmar nueva contraseña', submit: 'Actualizar contraseña', submitting: 'Actualizando de forma segura…', successTitle: 'Contraseña actualizada', success: 'La contraseña se cambió. Inicia sesión de nuevo con la nueva contraseña.', invalid: 'Este enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.', mismatch: 'Las contraseñas no coinciden.', weak: 'Usa al menos 8 caracteres.', unavailable: 'No se pudo actualizar la contraseña. Solicita un nuevo enlace e inténtalo otra vez.', request: 'Solicitar un nuevo enlace', signIn: 'Volver al inicio de sesión', checking: 'Validando la sesión de recuperación…',
  },
  fr: {
    eyebrow: 'RÉINITIALISATION SÉCURISÉE DU MOT DE PASSE', title: 'Choisissez un nouveau mot de passe', subtitle: 'La session de récupération doit être valide avant toute modification.', password: 'Nouveau mot de passe', confirm: 'Confirmer le nouveau mot de passe', submit: 'Mettre à jour le mot de passe', submitting: 'Mise à jour sécurisée…', successTitle: 'Mot de passe mis à jour', success: 'Votre mot de passe a été modifié. Reconnectez-vous avec le nouveau mot de passe.', invalid: 'Ce lien de récupération est invalide ou expiré. Demandez un nouveau lien.', mismatch: 'Les mots de passe ne correspondent pas.', weak: 'Utilisez au moins 8 caractères.', unavailable: 'Le mot de passe n’a pas pu être mis à jour. Demandez un nouveau lien et réessayez.', request: 'Demander un nouveau lien', signIn: 'Retour à la connexion', checking: 'Validation de la session de récupération…',
  },
  it: {
    eyebrow: 'REIMPOSTAZIONE SICURA DELLA PASSWORD', title: 'Scegli una nuova password', subtitle: 'La sessione di recupero deve essere valida prima di modificare la password.', password: 'Nuova password', confirm: 'Conferma nuova password', submit: 'Aggiorna password', submitting: 'Aggiornamento sicuro…', successTitle: 'Password aggiornata', success: 'La password è stata modificata. Accedi di nuovo con la nuova password.', invalid: 'Questo link di recupero non è valido o è scaduto. Richiedine uno nuovo.', mismatch: 'Le password non coincidono.', weak: 'Usa almeno 8 caratteri.', unavailable: 'Impossibile aggiornare la password. Richiedi un nuovo link e riprova.', request: 'Richiedi un nuovo link', signIn: 'Torna al login', checking: 'Verifica della sessione di recupero…',
  },
  de: {
    eyebrow: 'SICHERES PASSWORT-ZURÜCKSETZEN', title: 'Neues Passwort wählen', subtitle: 'Die Wiederherstellungssitzung muss gültig sein, bevor das Passwort geändert wird.', password: 'Neues Passwort', confirm: 'Neues Passwort bestätigen', submit: 'Passwort aktualisieren', submitting: 'Wird sicher aktualisiert…', successTitle: 'Passwort aktualisiert', success: 'Ihr Passwort wurde geändert. Melden Sie sich mit dem neuen Passwort erneut an.', invalid: 'Dieser Wiederherstellungslink ist ungültig oder abgelaufen. Fordern Sie einen neuen Link an.', mismatch: 'Die Passwörter stimmen nicht überein.', weak: 'Verwenden Sie mindestens 8 Zeichen.', unavailable: 'Das Passwort konnte nicht aktualisiert werden. Fordern Sie einen neuen Link an und versuchen Sie es erneut.', request: 'Neuen Link anfordern', signIn: 'Zurück zur Anmeldung', checking: 'Wiederherstellungssitzung wird geprüft…',
  },
} as const;

function activeLocale(value: string | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : 'en';
}

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = activeLocale(params?.locale);
  const text = copy[locale];
  const [state, setState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const timeout = window.setTimeout(() => {
      if (mounted) setState((current) => (current === 'checking' ? 'invalid' : current));
    }, 5_000);

    void supabase.auth.getSession().then(({ data }: { data: { session: unknown | null } }) => {
      if (!mounted) return;
      setState(data.session ? 'ready' : 'invalid');
    }).catch(() => {
      if (mounted) setState('invalid');
    });

    const { data } = supabase.auth.onAuthStateChange((event: string, session: unknown | null) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) setState('ready');
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(text.weak);
      return;
    }
    if (password !== confirmation) {
      setError(text.mismatch);
      return;
    }
    if (state !== 'ready') {
      setError(text.invalid);
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(text.unavailable);
        return;
      }
      await supabase.auth.signOut();
      setPassword('');
      setConfirmation('');
      setState('success');
    } catch {
      setError(text.unavailable);
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = 'mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e18] px-4 py-8 text-white">
      <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0b121e] p-6 sm:p-8">
        <Link href={`/${locale}`} aria-label="RISCK COMPLY" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
          <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={164} height={32} priority className="h-6 w-auto" />
        </Link>
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">{text.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-100 sm:text-3xl">{state === 'success' ? text.successTitle : text.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{state === 'success' ? text.success : text.subtitle}</p>

        {state === 'checking' ? <div className="mt-6 rounded-lg border border-slate-800 bg-[#0d1624] px-4 py-3 text-sm text-slate-400" role="status" aria-live="polite">{text.checking}</div> : null}

        {state === 'invalid' ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3 text-sm leading-6 text-amber-100" role="alert">{text.invalid}</div>
            <Link href={`/${locale}/recover-password`} className="flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">{text.request}</Link>
          </div>
        ) : null}

        {state === 'ready' ? (
          <form className="mt-6 space-y-4" onSubmit={updatePassword}>
            {error ? <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-4 py-3 text-sm leading-6 text-rose-100" role="alert" aria-live="polite">{error}</div> : null}
            <label className="block text-xs font-medium text-slate-400">{text.password}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" disabled={busy} className={fieldClass} /></label>
            <label className="block text-xs font-medium text-slate-400">{text.confirm}<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} autoComplete="new-password" disabled={busy} className={fieldClass} /></label>
            <button type="submit" disabled={busy} className="h-10 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60">{busy ? text.submitting : text.submit}</button>
          </form>
        ) : null}

        {state === 'success' ? <Link href={`/${locale}/login`} className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">{text.signIn}</Link> : null}
      </section>
    </main>
  );
}
