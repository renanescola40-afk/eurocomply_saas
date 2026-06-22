'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, EyeOff, FileSearch, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  loading: { icon: Loader2, tone: 'border-blue-500/25 bg-blue-500/10 text-blue-100', ariaLive: 'polite' },
  empty: { icon: FileSearch, tone: 'border-white/10 bg-white/[0.05] text-white', ariaLive: 'polite' },
  error: { icon: AlertTriangle, tone: 'border-red-500/30 bg-red-500/10 text-red-100', ariaLive: 'assertive' },
  'permission-denied': { icon: EyeOff, tone: 'border-amber-500/30 bg-amber-500/10 text-amber-100', ariaLive: 'assertive' },
  success: { icon: CheckCircle2, tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100', ariaLive: 'polite' },
  offline: { icon: CloudOff, tone: 'border-slate-400/25 bg-slate-400/10 text-slate-100', ariaLive: 'assertive' },
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
    <Card
      className={cn('border-white/10 bg-[#070707]/92 text-white shadow-2xl shadow-black/20', className)}
      role={kind === 'error' || kind === 'permission-denied' || kind === 'offline' ? 'alert' : 'status'}
      aria-live={config.ariaLive}
    >
      <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border', config.tone)}>
            <Icon className={cn('h-5 w-5', kind === 'loading' && 'animate-spin')} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
            <p className="max-w-2xl text-sm leading-6 text-white/62">{description}</p>
          </div>
        </div>
        {(actionLabel || secondaryActionLabel) && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {secondaryActionLabel && (
              <Button
                type="button"
                variant="outline"
                className="border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </Button>
            )}
            {actionLabel && (
              <Button
                type="button"
                className="bg-white text-black hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EnterpriseSkeleton({ label = 'A carregar dados críticos…' }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={label}>
      <div className="sr-only">{label}</div>
      <div className="h-24 animate-pulse rounded-3xl border border-white/10 bg-white/[0.05]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        <div className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        <div className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>
    </div>
  );
}

export function PermissionHint({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </div>
  );
}
