'use client';

import { useEffect, useState } from 'react';

import { STEP_UP_TOKEN_HEADER, StepUpMfaDialog } from '@/components/security/step-up-mfa-dialog';

type SecuritySettings = {
  stepUpProviderMode: string;
  allowedIdpAcrValues: string[];
  allowedIdpAmrValues: string[];
  requireMfaForAllUsers: boolean;
};

export function TenantMfaPolicyCard({ locale }: { locale: string }) {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [desired, setDesired] = useState<boolean | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [status, setStatus] = useState('Loading MFA policy…');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const response = await fetch('/api/security/settings', { credentials: 'same-origin', cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.settings) {
      setError(body.error ?? 'Could not load MFA policy.');
      return;
    }
    setSettings(body.settings as SecuritySettings);
    setStatus(body.settings.requireMfaForAllUsers ? 'Required for all workspace users' : 'Not required tenant-wide');
  }

  useEffect(() => {
    void load();
  }, []);

  function requestChange(next: boolean) {
    setDesired(next);
    setError('');
    setStepUpOpen(true);
  }

  async function persist(token: string) {
    if (!settings || desired === null) return;
    setStepUpOpen(false);
    setStatus('Saving MFA policy…');

    const response = await fetch('/api/security/settings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        [STEP_UP_TOKEN_HEADER]: token,
      },
      body: JSON.stringify({
        stepUpProviderMode: settings.stepUpProviderMode,
        allowedIdpAcrValues: settings.allowedIdpAcrValues,
        allowedIdpAmrValues: settings.allowedIdpAmrValues,
        requireMfaForAllUsers: desired,
      }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? 'Could not update MFA policy.');
      setStatus(settings.requireMfaForAllUsers ? 'Required for all workspace users' : 'Not required tenant-wide');
      return;
    }

    const updated = { ...settings, requireMfaForAllUsers: Boolean(body.settings?.requireMfaForAllUsers) };
    setSettings(updated);
    setDesired(null);
    setStatus(updated.requireMfaForAllUsers ? 'Required for all workspace users' : 'Not required tenant-wide');

    if (updated.requireMfaForAllUsers) {
      window.location.href = `/${locale}/mfa?next=${encodeURIComponent(`/${locale}/dashboard/organizations/team`)}`;
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1624] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-400">Tenant-wide MFA</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Require AAL2 for workspace access</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            When enabled, workspace pages, protected APIs and tenant-scoped RLS access require an AAL2 session for every user.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-300">{status}</p>
          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/${locale}/mfa?setup=1&next=${encodeURIComponent(`/${locale}/dashboard/organizations/team`)}`}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Set up MFA
          </a>
          {settings?.requireMfaForAllUsers ? (
            <button
              type="button"
              onClick={() => requestChange(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Disable requirement
            </button>
          ) : (
            <button
              type="button"
              onClick={() => requestChange(true)}
              disabled={!settings}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Require MFA
            </button>
          )}
        </div>
      </div>

      <StepUpMfaDialog
        action="change_security_settings"
        open={stepUpOpen}
        title="Confirm MFA policy change"
        description="Verify a strong authentication factor before changing the workspace-wide MFA requirement."
        onCancel={() => {
          setStepUpOpen(false);
          setDesired(null);
        }}
        onToken={(token) => void persist(token)}
      />
    </section>
  );
}
