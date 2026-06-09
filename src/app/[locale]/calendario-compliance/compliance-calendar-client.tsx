'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bot, CalendarDays, CheckCircle2, Clock3, ExternalLink, Sparkles, X } from 'lucide-react';

type ObligationStatus = 'Pendente' | 'Concluído' | 'Adiado';

type Obligation = {
  id: string;
  title: string;
  country: string;
  type: 'Fiscal' | 'Trabalhista' | 'Ambiental' | 'Dados' | 'Governança';
  due: string;
  owner: string;
  status: ObligationStatus;
  description: string;
  legalBasis: string;
  penalty: string;
  source: string;
  sourceUrl: string;
};

const storageKey = 'eurocomply-compliance-calendar-v1';

const initialObligations: Obligation[] = [
  {
    id: 'cal-pt-ies',
    title: 'Entrega IES — Informação Empresarial Simplificada',
    country: 'Portugal',
    type: 'Fiscal',
    due: '2026-07-31',
    owner: 'Finance Ops',
    status: 'Pendente',
    description: 'Entrega anual da Informação Empresarial Simplificada para reporte contabilístico, fiscal e estatístico.',
    legalBasis: 'Código do IRC e regime IES aplicável em Portugal.',
    penalty: 'Coimas administrativas e atrasos em obrigações fiscais acessórias.',
    source: 'Diário da República',
    sourceUrl: 'https://dre.pt',
  },
  {
    id: 'cal-fr-tva',
    title: 'Déclaration de TVA mensuelle',
    country: 'França',
    type: 'Fiscal',
    due: '2026-05-15',
    owner: 'Finance Ops',
    status: 'Pendente',
    description: 'Declaração mensal de IVA para entidades sujeitas a reporte periódico em França.',
    legalBasis: 'Code général des impôts — obrigações de TVA.',
    penalty: 'Juros de mora e penalizações fiscais por declaração tardia.',
    source: 'Journal Officiel',
    sourceUrl: 'https://www.legifrance.gouv.fr',
  },
  {
    id: 'cal-es-303',
    title: 'Modelo 303 — IVA trimestral',
    country: 'Espanha',
    type: 'Fiscal',
    due: '2026-04-20',
    owner: 'Finance Ops',
    status: 'Pendente',
    description: 'Apresentação trimestral do IVA para empresas com operações tributáveis em Espanha.',
    legalBasis: 'Agencia Tributaria — Modelo 303.',
    penalty: 'Recargos e sanções fiscais por atraso ou omissão.',
    source: 'BOE / Agencia Tributaria',
    sourceUrl: 'https://www.boe.es',
  },
  {
    id: 'cal-de-ust',
    title: 'Umsatzsteuer-Voranmeldung',
    country: 'Alemanha',
    type: 'Fiscal',
    due: '2026-05-10',
    owner: 'Finance Ops',
    status: 'Pendente',
    description: 'Declaração antecipada de IVA para empresas registadas na Alemanha.',
    legalBasis: 'Umsatzsteuergesetz e regras fiscais alemãs.',
    penalty: 'Multas fiscais e juros por reporte tardio.',
    source: 'Bundesfinanzministerium',
    sourceUrl: 'https://www.bundesfinanzministerium.de',
  },
  {
    id: 'cal-it-iva',
    title: 'Dichiarazione IVA annuale',
    country: 'Itália',
    type: 'Fiscal',
    due: '2026-04-30',
    owner: 'Finance Ops',
    status: 'Pendente',
    description: 'Declaração anual de IVA para organizações com obrigações fiscais em Itália.',
    legalBasis: 'Agenzia delle Entrate — disciplina IVA.',
    penalty: 'Sanções fiscais e regularização obrigatória.',
    source: 'Gazzetta Ufficiale / Agenzia Entrate',
    sourceUrl: 'https://www.agenziaentrate.gov.it',
  },
  {
    id: 'cal-eu-gdpr',
    title: 'Revisão anual de DPIA e bases legais RGPD',
    country: 'União Europeia',
    type: 'Dados',
    due: '2026-06-30',
    owner: 'Compliance Lead',
    status: 'Pendente',
    description: 'Revisão anual das avaliações de impacto, bases legais e medidas de mitigação de privacidade.',
    legalBasis: 'RGPD, artigos 5, 6, 30, 32 e 35.',
    penalty: 'Risco regulatório, medidas corretivas e coimas administrativas.',
    source: 'EDPB / EUR-Lex',
    sourceUrl: 'https://edpb.europa.eu',
  },
];

const aiDetectedObligations: Obligation[] = [
  {
    id: 'ai-fr-tva-2026',
    title: 'Novo prazo para entrega da declaração de IVA em França',
    country: 'França',
    type: 'Fiscal',
    due: '2026-05-25',
    owner: 'Finance Ops',
    status: 'Pendente',
    description: 'A IA detetou atualização simulada em fonte oficial francesa sobre janela de entrega de TVA mensal.',
    legalBasis: 'Journal Officiel — atualização fiscal simulada.',
    penalty: 'Penalidades por atraso, juros e necessidade de regularização.',
    source: 'Journal Officiel',
    sourceUrl: 'https://www.legifrance.gouv.fr',
  },
  {
    id: 'ai-pt-cnpd-2026',
    title: 'Revisão de evidências para avaliação de impacto RGPD',
    country: 'Portugal',
    type: 'Dados',
    due: '2026-06-12',
    owner: 'Compliance Lead',
    status: 'Pendente',
    description: 'A IA sinalizou orientação simulada da autoridade portuguesa para reforçar evidências de DPIA em processos de alto risco.',
    legalBasis: 'RGPD art. 35 e orientações CNPD simuladas.',
    penalty: 'Pedidos de correção, risco de inspeção e fragilidade em auditoria.',
    source: 'CNPD Portugal',
    sourceUrl: 'https://www.cnpd.pt',
  },
  {
    id: 'ai-es-laboral-2026',
    title: 'Atualização de registo laboral para entidades com operação em Espanha',
    country: 'Espanha',
    type: 'Trabalhista',
    due: '2026-06-05',
    owner: 'Legal Counsel',
    status: 'Pendente',
    description: 'A IA encontrou obrigação simulada de revisão documental laboral para empresas com equipas locais.',
    legalBasis: 'BOE — referência laboral simulada.',
    penalty: 'Risco de sanções administrativas e pedidos de documentação adicional.',
    source: 'BOE',
    sourceUrl: 'https://www.boe.es',
  },
];

const countryStyles: Record<string, string> = {
  Portugal: 'bg-emerald-400/15 text-emerald-100 border-emerald-300/30',
  França: 'bg-sky-400/15 text-sky-100 border-sky-300/30',
  Espanha: 'bg-amber-400/15 text-amber-100 border-amber-300/30',
  Alemanha: 'bg-violet-400/15 text-violet-100 border-violet-300/30',
  Itália: 'bg-rose-400/15 text-rose-100 border-rose-300/30',
  'União Europeia': 'bg-indigo-400/15 text-indigo-100 border-indigo-300/30',
};

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function sameMonth(dateIso: string, current: Date) {
  const value = new Date(`${dateIso}T12:00:00`);
  return value.getFullYear() === current.getFullYear() && value.getMonth() === current.getMonth();
}

function notifyLocally(message: string) {
  const key = 'eurocomply-local-notifications-v1';
  const current = JSON.parse(window.localStorage.getItem(key) ?? '[]') as Array<{ id: string; message: string; type: string; createdAt: string; read: boolean }>;
  current.unshift({ id: crypto.randomUUID(), message, type: 'calendar', createdAt: new Date().toISOString(), read: false });
  window.localStorage.setItem(key, JSON.stringify(current.slice(0, 30)));
}

export default function ComplianceCalendarClient({ locale }: { locale: string }) {
  const [obligations, setObligations] = useState<Obligation[]>(initialObligations);
  const [toast, setToast] = useState('');
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 4, 1));
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        setObligations(JSON.parse(saved));
      } catch {
        setObligations(initialObligations);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(obligations));
  }, [obligations]);

  const pendingCount = useMemo(() => obligations.filter((item) => item.status === 'Pendente').length, [obligations]);
  const monthEvents = useMemo(() => obligations.filter((item) => sameMonth(item.due, currentMonth)), [obligations, currentMonth]);
  const days = Array.from({ length: getDaysInMonth(currentMonth) }, (_, index) => index + 1);

  const setStatus = (id: string, status: ObligationStatus) => {
    const target = obligations.find((item) => item.id === id);
    setObligations((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    setToast(status === 'Concluído' ? 'Obrigação marcada como cumprida e registada na trilha de auditoria simulada.' : 'Prazo marcado como adiado para revisão interna.');
    if (target && status === 'Concluído') {
      notifyLocally(`Obrigação cumprida: ${target.title}`);
    }
  };

  const runAiSearch = () => {
    setIsSearching(true);
    setToast('IA a consultar fontes oficiais simuladas: Diário da República, Journal Officiel, BOE e EUR-Lex...');
    window.setTimeout(() => {
      setObligations((items) => {
        const existing = new Set(items.map((item) => item.id));
        const additions = aiDetectedObligations.filter((item) => !existing.has(item.id));
        additions.forEach((item) => notifyLocally(`Novo prazo legal detetado por IA: ${item.title}`));
        return additions.length ? [...items, ...additions] : items;
      });
      setToast('IA adicionou novos prazos ao calendário e gerou notificações locais.');
      setIsSearching(false);
    }, 1100);
  };

  const nextMonth = () => setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  const previousMonth = () => setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Calendário legal com IA</p>
            <h1 className="mt-2 text-3xl font-semibold">Calendário de Obrigações Europeias</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Acompanhe prazos por país, simule pesquisa em fontes oficiais e transforme obrigações cumpridas em evidência operacional.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={runAiSearch} disabled={isSearching} className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-70">
              <Bot className="h-4 w-4" /> {isSearching ? 'IA a procurar...' : 'Buscar prazos com IA'}
            </button>
            <Link href={`/${locale}/auditoria`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-300/50 hover:bg-amber-300/10">
              Ver trilha de auditoria
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <CalendarDays className="h-5 w-5 text-amber-300" />
            <p className="mt-3 text-2xl font-semibold">{obligations.length}</p>
            <p className="text-sm text-slate-400">Obrigações mapeadas</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <AlertTriangle className="h-5 w-5 text-rose-300" />
            <p className="mt-3 text-2xl font-semibold">{pendingCount}</p>
            <p className="text-sm text-slate-400">Alertas pendentes</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <Sparkles className="h-5 w-5 text-sky-300" />
            <p className="mt-3 text-2xl font-semibold">IA</p>
            <p className="text-sm text-slate-400">Fontes oficiais simuladas</p>
          </div>
        </div>
      </div>

      {toast ? <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{toast}</div> : null}

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Visão {view === 'month' ? 'mensal' : 'semanal'}</p>
            <h2 className="text-xl font-semibold capitalize">{currentMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={previousMonth} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">Mês anterior</button>
            <button type="button" onClick={nextMonth} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">Próximo mês</button>
            <button type="button" onClick={() => setView(view === 'month' ? 'week' : 'month')} className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/15">{view === 'month' ? 'Ver semana' : 'Ver mês'}</button>
          </div>
        </div>

        {view === 'month' ? (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-7">
            {days.map((day) => {
              const date = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = monthEvents.filter((item) => item.due === date);
              return (
                <div key={day} className="min-h-28 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <p className="text-xs font-semibold text-slate-400">{day}</p>
                  <div className="mt-2 space-y-2">
                    {events.map((event) => (
                      <button key={event.id} type="button" onClick={() => setSelected(event)} className={`w-full rounded-xl border px-2 py-2 text-left text-xs transition hover:scale-[1.01] ${countryStyles[event.country] ?? 'border-white/10 bg-white/10 text-slate-100'}`}>
                        <span className="block font-semibold">{event.country}</span>
                        <span className="line-clamp-2">{event.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {monthEvents.slice(0, 7).map((event) => (
              <button key={event.id} type="button" onClick={() => setSelected(event)} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-left transition hover:border-amber-300/40 hover:bg-amber-300/10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs ${countryStyles[event.country] ?? 'border-white/10 bg-white/10 text-slate-100'}`}>{event.country}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{event.type}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{event.due}</span>
                </div>
                <h3 className="mt-3 font-semibold">{event.title}</h3>
                <p className="text-sm text-slate-400">{event.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {obligations.map((obligation) => (
          <article key={obligation.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs ${countryStyles[obligation.country] ?? 'border-white/10 bg-white/10 text-slate-100'}`}>{obligation.country}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{obligation.type}</span>
                  <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-100">Vence em {obligation.due}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{obligation.status}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{obligation.title}</h2>
                <p className="text-sm text-slate-400">Responsável: {obligation.owner}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelected(obligation)} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                  Detalhes
                </button>
                <button type="button" onClick={() => setStatus(obligation.id, 'Concluído')} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Cumprido
                </button>
                <button type="button" onClick={() => setStatus(obligation.id, 'Adiado')} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                  Adiar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-amber-300">{selected.country} · {selected.type}</p>
                <h2 className="mt-2 text-2xl font-semibold">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <p>{selected.description}</p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><strong className="text-slate-100">Base legal:</strong> {selected.legalBasis}</div>
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4"><strong className="text-rose-100">Penalidade por atraso:</strong> {selected.penalty}</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p><strong className="text-slate-100">Fonte oficial simulada:</strong> {selected.source}</p>
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-amber-200 hover:text-amber-100">Abrir fonte <ExternalLink className="h-4 w-4" /></a>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" onClick={() => { setStatus(selected.id, 'Concluído'); setSelected(null); }} className="rounded-full bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-300">Marcar como cumprido</button>
                <button type="button" onClick={() => { setStatus(selected.id, 'Adiado'); setSelected(null); }} className="rounded-full border border-white/15 px-4 py-2 text-slate-200 transition hover:bg-white/10">Adiar revisão</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
