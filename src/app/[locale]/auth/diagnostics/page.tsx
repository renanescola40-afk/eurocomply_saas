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
    <main className="min-h-screen bg-[#050505] px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200/80">Auth diagnostics</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Google login production check</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Use this page after a Google login attempt to confirm whether Supabase created a browser session and which callback URL must be allowlisted.
          </p>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl">
          {!state ? (
            <p className="text-sm text-white/55">Checking auth state...</p>
          ) : (
            <div className="grid gap-4">
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

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-6 text-white/60">
          <p className="font-semibold text-white">Supabase checklist</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Add the displayed callback URL in Supabase Authentication → URL Configuration → Redirect URLs.</li>
            <li>Add your production domain as Site URL.</li>
            <li>Enable Google provider in Supabase Authentication → Providers.</li>
            <li>After changing Supabase settings, test again in a private browser window.</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/login`} className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
            Back to login
          </Link>
          <Link href={expectedDashboard} className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold hover:bg-white/10">
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function DiagnosticRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'bad' | 'warn' }) {
  const toneClass = {
    neutral: 'text-white/80',
    good: 'text-emerald-200',
    bad: 'text-rose-200',
    warn: 'text-amber-200',
  }[tone];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className={`mt-2 break-words text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
