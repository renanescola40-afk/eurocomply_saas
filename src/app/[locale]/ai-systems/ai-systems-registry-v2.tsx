'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Search, ShieldAlert, UserCheck } from 'lucide-react';

import type { AiSystemRecord } from '@/server/queries/ai-systems';

type AiSystemsRegistryV2Props = {
  locale: string;
  systems: AiSystemRecord[];
  organizationName?: string | null;
};

const copy = {
  en: {
    eyebrow: 'Enterprise register',
    title: 'AI systems registry',
    subtitle: 'Review the organization inventory as an operational register. Search and filter the live workspace data without changing the underlying assessment workflow.',
    organization: 'Organization',
    search: 'Search systems, owners, providers or markets',
    allRisk: 'All risk levels',
    allStatus: 'All lifecycle states',
    total: 'Total systems',
    attention: 'High attention',
    transparency: 'Transparency review',
    owned: 'Owner assigned',
    system: 'System',
    risk: 'Risk level',
    role: 'Role',
    owner: 'Owner',
    market: 'Market',
    provider: 'Provider / model',
    lifecycle: 'Lifecycle',
    updated: 'Updated',
    action: 'Action',
    open: 'Open detail',
    empty: 'No AI systems match the current filters.',
    unassigned: 'Unassigned',
    unknown: '—',
    workspace: 'Assessment & registration workspace',
    workspaceText: 'Use the existing governed workflow below to register, classify, reassess and manage AI systems.',
  },
  pt: {
    eyebrow: 'Registo enterprise',
    title: 'Registo de sistemas de IA',
    subtitle: 'Consulte o inventário da organização como um registo operacional. Pesquise e filtre os dados reais do workspace sem alterar o fluxo de avaliação existente.',
    organization: 'Organização',
    search: 'Pesquisar sistemas, responsáveis, fornecedores ou mercados',
    allRisk: 'Todos os níveis de risco',
    allStatus: 'Todos os estados do ciclo de vida',
    total: 'Total de sistemas',
    attention: 'Atenção alta',
    transparency: 'Revisão de transparência',
    owned: 'Com responsável',
    system: 'Sistema',
    risk: 'Nível de risco',
    role: 'Papel',
    owner: 'Responsável',
    market: 'Mercado',
    provider: 'Fornecedor / modelo',
    lifecycle: 'Ciclo de vida',
    updated: 'Atualizado',
    action: 'Ação',
    open: 'Abrir detalhe',
    empty: 'Nenhum sistema de IA corresponde aos filtros atuais.',
    unassigned: 'Sem responsável',
    unknown: '—',
    workspace: 'Workspace de avaliação e registo',
    workspaceText: 'Use o fluxo governado existente abaixo para registar, classificar, reavaliar e gerir sistemas de IA.',
  },
} as const;

function riskLabel(level: string) {
  if (level === 'prohibited_review') return 'Prohibited review';
  if (level === 'high_risk_review') return 'High-risk review';
  if (level === 'limited_transparency') return 'Limited / transparency';
  if (level === 'minimal_low') return 'Minimal / low';
  return level.replaceAll('_', ' ');
}

function riskTone(level: string) {
  if (level === 'prohibited_review') return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  if (level === 'high_risk_review') return 'border-amber-400/25 bg-amber-400/10 text-amber-300';
  if (level === 'limited_transparency') return 'border-blue-400/25 bg-blue-400/10 text-blue-300';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300';
}

function humanize(value: string | null | undefined) {
  if (!value) return '—';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatUpdated(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function AiSystemsRegistryV2({ locale, systems, organizationName }: AiSystemsRegistryV2Props) {
  const t = locale === 'pt' ? copy.pt : copy.en;
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const riskLevels = useMemo(() => Array.from(new Set(systems.map((system) => system.risk_level))).sort(), [systems]);
  const lifecycleStates = useMemo(
    () => Array.from(new Set(systems.map((system) => system.lifecycle_status))).sort(),
    [systems],
  );

  const metrics = useMemo(() => ({
    attention: systems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review').length,
    transparency: systems.filter((system) => system.risk_level === 'limited_transparency').length,
    owned: systems.filter((system) => Boolean(system.owner_team?.trim())).length,
  }), [systems]);

  const filteredSystems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return systems.filter((system) => {
      if (riskFilter !== 'all' && system.risk_level !== riskFilter) return false;
      if (statusFilter !== 'all' && system.lifecycle_status !== statusFilter) return false;
      if (!normalizedQuery) return true;

      return [
        system.name,
        system.owner_team,
        system.category,
        system.country_market,
        system.vendor_name,
        system.model_name,
        system.use_case,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [query, riskFilter, statusFilter, systems]);

  return (
    <section className="mx-auto max-w-[1600px] px-4 pb-2 pt-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e] shadow-[0_24px_80px_rgba(0,0,0,.22)]">
        <div className="border-b border-slate-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">{t.eyebrow}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">{t.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">{t.subtitle}</p>
              {organizationName ? (
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                  {t.organization}: {organizationName}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-4 xl:min-w-[560px]">
              {[
                [t.total, systems.length],
                [t.attention, metrics.attention],
                [t.transparency, metrics.transparency],
                [t.owned, metrics.owned],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-[#0d1624] px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">{label}</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-800 bg-[#09101a] px-5 py-4 md:grid-cols-[1fr_220px_220px] sm:px-6">
          <label className="relative block">
            <span className="sr-only">{t.search}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] pl-9 pr-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
            />
          </label>
          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-300 outline-none focus:border-blue-500/60"
            aria-label={t.allRisk}
          >
            <option value="all">{t.allRisk}</option>
            {riskLevels.map((level) => <option key={level} value={level}>{riskLabel(level)}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-300 outline-none focus:border-blue-500/60"
            aria-label={t.allStatus}
          >
            <option value="all">{t.allStatus}</option>
            {lifecycleStates.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full border-collapse text-left">
            <thead className="bg-[#080e18]">
              <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                <th className="px-5 py-3 sm:px-6">{t.system}</th>
                <th className="px-4 py-3">{t.risk}</th>
                <th className="px-4 py-3">{t.role}</th>
                <th className="px-4 py-3">{t.owner}</th>
                <th className="px-4 py-3">{t.market}</th>
                <th className="px-4 py-3">{t.provider}</th>
                <th className="px-4 py-3">{t.lifecycle}</th>
                <th className="px-4 py-3">{t.updated}</th>
                <th className="px-5 py-3 text-right sm:px-6">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSystems.map((system) => (
                <tr key={system.id} className="group bg-[#0b121e] transition hover:bg-[#0e1827]">
                  <td className="px-5 py-4 sm:px-6">
                    <p className="max-w-[260px] truncate text-sm font-semibold text-slate-100">{system.name}</p>
                    <p className="mt-1 max-w-[260px] truncate text-xs text-slate-600">{system.category ?? system.use_case}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${riskTone(system.risk_level)}`}>
                      {riskLabel(system.risk_level)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-slate-400">{humanize(system.role)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${system.owner_team ? 'text-slate-300' : 'text-amber-300'}`}>
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {system.owner_team || t.unassigned}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">{system.country_market || t.unknown}</td>
                  <td className="px-4 py-4">
                    <p className="max-w-[180px] truncate text-xs text-slate-400">{system.vendor_name || t.unknown}</p>
                    <p className="mt-1 max-w-[180px] truncate text-[11px] text-slate-700">{system.model_name || t.unknown}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-400">{humanize(system.lifecycle_status)}</td>
                  <td className="px-4 py-4 font-mono text-[11px] tabular-nums text-slate-600">{formatUpdated(system.updated_at, locale)}</td>
                  <td className="px-5 py-4 text-right sm:px-6">
                    <Link
                      href={`/${locale}/ai-systems/${system.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      {t.open}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSystems.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center border-t border-slate-800 px-6 py-10 text-center text-sm text-slate-500">
            <div><ShieldAlert className="mx-auto mb-3 h-5 w-5 text-slate-700" aria-hidden="true" />{t.empty}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-l-2 border-blue-500/50 px-4 py-1">
        <h2 className="text-sm font-semibold text-slate-200">{t.workspace}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t.workspaceText}</p>
      </div>
    </section>
  );
}
