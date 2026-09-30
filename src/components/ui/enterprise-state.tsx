'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, EyeOff, FileSearch, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EnterpriseStateKind = 'loading' | 'empty' | 'error' | 'permission-denied' | 'success' | 'offline';

type EnterpriseStateProps = {
  kind: EnterpriseStateKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

const stateConfig: Record<EnterpriseStateKind, { icon: typeof Loader2; tone: string; ariaLive: 'polite' | 'assertive' }> = {
  loading: { icon: Loader2, tone: 'border-blue-500/25 bg-blue-500/10 text-blue-200', ariaLive: 'polite' },
  empty: { icon: FileSearch, tone: 'border-slate-700 bg-[#0d1624] text-slate-300', ariaLive: 'polite' },
  error: { icon: AlertTriangle, tone: 'border-rose-500/25 bg-rose-500/[0.08] text-rose-200', ariaLive: 'assertive' },
  'permission-denied': { icon: EyeOff, tone: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-200', ariaLive: 'assertive' },
  success: { icon: CheckCircle2, tone: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200', ariaLive: 'polite' },
  offline: { icon: CloudOff, tone: 'border-slate-700 bg-slate-800/60 text-slate-300', ariaLive: 'assertive' },
};

export function EnterpriseState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EnterpriseStateProps) {
  const config = stateConfig[kind];
  const Icon = config.icon;

  return (
    <div
      className={cn('rounded-xl border border-slate-800 bg-[#0b121e] text-white', className)}
      role={kind === 'error' || kind === 'permission-denied' || kind === 'offline' ? 'alert' : 'status'}
      aria-live={config.ariaLive}
    >
      <div className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-4">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', config.tone)}>
            <Icon className={cn('h-4 w-4', kind === 'loading' && 'animate-spin')} aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
          </div>
        </div>
        {(actionLabel || secondaryActionLabel) && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {secondaryActionLabel && (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-slate-700 bg-[#0d1624] px-4 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500/30"
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </Button>
            )}
            {actionLabel && (
              <Button
                type="button"
                className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/40"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EnterpriseSkeleton({ label = 'A carregar dados críticos…' }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={label}>
      <div className="sr-only">{label}</div>
      <div className="h-24 animate-pulse rounded-xl border border-slate-800 bg-[#0d1624]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-36 animate-pulse rounded-xl border border-slate-800 bg-[#0b121e]" />
        <div className="h-36 animate-pulse rounded-xl border border-slate-800 bg-[#0b121e]" />
        <div className="h-36 animate-pulse rounded-xl border border-slate-800 bg-[#0b121e]" />
      </div>
    </div>
  );
}

export function PermissionHint({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-xs font-medium text-amber-200">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </div>
  );
}
