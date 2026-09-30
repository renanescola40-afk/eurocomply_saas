'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';

type DiagnosticState = {
  hasSession: boolean;
  userEmail: string | null;
  hasCodeInUrl: boolean;
  origin: string;
  callbackUrl: string;
  expectedDashboard: string;
  error: string | null;
};

export default function AuthDiagnosticsPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'pt';
  const [state, setState] = useState<DiagnosticState | null>(null);

  const expectedDashboard = useMemo(() => `/${locale}/dashboard/organizations`, [locale]);

  useEffect(() => {
    async function runDiagnostics() {
      try {
        const origin = window.location.origin;
        const url = new URL(window.location.href);
        const { data, error } = await supabase.auth.getSession();

        setState({
          hasSession: Boolean(data.session),
          userEmail: data.session?.user.email ?? null,
          hasCodeInUrl: url.searchParams.has('code'),
          origin,
          callbackUrl: `${origin}/auth/callback`,
          expectedDashboard,
          error: error?.message ?? null,
        });
      } catch (error) {
        setState({
          hasSession: false,
          userEmail: null,
          hasCodeInUrl: false,
          origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
          callbackUrl: 'unknown',
          expectedDashboard,
          error: error instanceof Error ? error.message : 'Unknown diagnostics error',
        });
      }
    }

    runDiagnostics();
  }, [expectedDashboard]);

  return (
    <main className="min-h-screen bg-[#080e18] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Auth diagnostics</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-100">Google login production check</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Use this page after a Google login attempt to confirm whether Supabase created a browser session and which callback URL must be allowlisted.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
          {!state ? (
            <p className="text-sm text-slate-400" role="status">Checking auth state...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <DiagnosticRow label="Session detected" value={state.hasSession ? 'Yes' : 'No'} tone={state.hasSession ? 'good' : 'bad'} />
              <DiagnosticRow label="User email" value={state.userEmail ?? 'No authenticated user'} />
              <DiagnosticRow label="OAuth code in current URL" value={state.hasCodeInUrl ? 'Yes' : 'No'} tone={state.hasCodeInUrl ? 'warn' : 'neutral'} />
              <DiagnosticRow label="Current origin" value={state.origin} />
              <DiagnosticRow label="Supabase redirect URL to allowlist" value={state.callbackUrl} />
              <DiagnosticRow label="Expected dashboard" value={state.expectedDashboard} />
              <DiagnosticRow label="Supabase client error" value={state.error ?? 'None'} tone={state.error ? 'bad' : 'good'} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 text-sm leading-6 text-slate-400 sm:p-6">
          <p className="font-semibold text-slate-100">Supabase checklist</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Add the displayed callback URL in Supabase Authentication → URL Configuration → Redirect URLs.</li>
            <li>Add your production domain as Site URL.</li>
            <li>Enable Google provider in Supabase Authentication → Providers.</li>
            <li>After changing Supabase settings, test again in a private browser window.</li>
          </ul>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/${locale}/login`} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
            Back to login
          </Link>
          <Link href={expectedDashboard} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-semibold text-slate-300 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30">
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function DiagnosticRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'bad' | 'warn' }) {
  const toneClass = {
    neutral: 'text-slate-300',
    good: 'text-emerald-300',
    bad: 'text-rose-300',
    warn: 'text-amber-300',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</p>
      <p className={`mt-2 break-words text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
