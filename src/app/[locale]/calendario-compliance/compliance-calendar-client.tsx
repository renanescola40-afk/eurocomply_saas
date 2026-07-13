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

type IntelligenceSuggestion = {
  source?: string;
  title?: string;
  country?: string;
  description?: string;
};

const storageKey = 'eurocomply-compliance-calendar-v1';
const notificationsStorageKey = 'eurocomply-local-notifications-v1';

const initialObligations: Obligation[] = [
  { id: 'cal-pt-ies', title: 'Entrega IES — Informação Empresarial Simplificada', country: 'Portugal', type: 'Fiscal', due: '2026-07-31', owner: 'Finance Ops', status: 'Pendente', description: 'Entrega anual da Informação Empresarial Simplificada para reporte contabilístico, fiscal e estatístico.', legalBasis: 'Código do IRC e regime IES aplicável em Portugal.', penalty: 'Coimas administrativas e atrasos em obrigações fiscais acessórias.', source: 'Diário da República', sourceUrl: 'https://dre.pt' },
  { id: 'cal-fr-tva', title: 'Déclaration de TVA mensuelle', country: 'França', type: 'Fiscal', due: '2026-05-15', owner: 'Finance Ops', status: 'Pendente', description: 'Declaração mensal de IVA para entidades sujeitas a reporte periódico em França.', legalBasis: 'Code général des impôts — obrigações de TVA.', penalty: 'Juros de mora e penalizações fiscais por declaração tardia.', source: 'Journal Officiel', sourceUrl: 'https://www.legifrance.gouv.fr' },
  { id: 'cal-es-303', title: 'Modelo 303 — IVA trimestral', country: 'Espanha', type: 'Fiscal', due: '2026-04-20', owner: 'Finance Ops', status: 'Pendente', description: 'Apresentação trimestral do IVA para empresas com operações tributáveis em Espanha.', legalBasis: 'Agencia Tributaria — Modelo 303.', penalty: 'Recargos e sanções fiscais por atraso ou omissão.', source: 'BOE / Agencia Tributaria', sourceUrl: 'https://www.boe.es' },
  { id: 'cal-de-ust', title: 'Umsatzsteuer-Voranmeldung', country: 'Alemanha', type: 'Fiscal', due: '2026-05-10', owner: 'Finance Ops', status: 'Pendente', description: 'Declaração antecipada de IVA para empresas registadas na Alemanha.', legalBasis: 'Umsatzsteuergeset e regras fiscais alemãs.', penalty: 'Multas fiscais e juros por reporte tardio.', source: 'Bundesfinanzministerium', sourceUrl: 'https://www.bundesfinanzministerium.de' },
  { id: 'cal-it-iva', title: 'Dichiarazione IVA annuale', country: 'Itália', type: 'Fiscal', due: '2026-04-30', owner: 'Finance Ops', status: 'Pendente', description: 'Declaração anual de IVA para organizações com obrigações fiscais em Itália.', legalBasis: 'Agenzia delle Entrate — disciplina IVA.', penalty: 'Sanções fiscais e regularização obrigatória.', source: 'Gazzetta Ufficiale / Agenzia Entrate', sourceUrl: 'https://www.agenziaentrate.gov.it' },
  { id: 'cal-eu-gdpr', title: 'Revisão anual de DPIA e bases legais RGPD', country: 'União Europeia', type: 'Dados', due: '2026-06-30', owner: 'Compliance Lead', status: 'Pendente', description: 'Revisão anual das avaliações de impacto, bases legais e medidas de mitigação de privacidade.', legalBasis: 'RGPD, artigos 5, 6, 30, 32 e 35.', penalty: 'Risco regulatório, medidas corretivas e coimas administrativas.', source: 'EDPB / EUR-Lex', sourceUrl: 'https://edpb.europa.eu' },
];

const aiDetectedObligations: Obligation[] = [
  { id: 'ai-fr-tva-2026', title: 'Novo prazo para entrega da declaração de IVA em França', country: 'França', type: 'Fiscal', due: '2026-05-25', owner: 'Finance Ops', status: 'Pendente', description: 'A IA detetou atualização simulada em fonte oficial francesa sobre janela de entrega de TVA mensal.', legalBasis: 'Journal Officiel — atualização fiscal simulada.', penalty: 'Penalidades por atraso, juros e necessidade de regularização.', source: 'Journal Officiel', sourceUrl: 'https://www.legifrance.gouv.fr' },
  { id: 'ai-pt-cnpd-2026', title: 'Revisão de evidências para avaliação de impacto RGPD', country: 'Portugal', type: 'Dados', due: '2026-06-12', owner: 'Compliance Lead', status: 'Pendente', description: 'A IA sinalizou orientação simulada da autoridade portuguesa para reforçar evidências de DPIA em processos de alto risco.', legalBasis: 'RGPD art. 35 e orientações CNPD simuladas.', penalty: 'Pedidos de correção, risco de inspeção e fragilidade em auditoria.', source: 'CNPD Portugal', sourceUrl: 'https://www.cnpd.pt' },
  { id: 'ai-es-laboral-2026', title: 'Atualização de registo laboral para entidades com operação em Espanha', country: 'Espanha', type: 'Trabalhista', due: '2026-06-05', owner: 'Legal Counsel', status: 'Pendente', description: 'A IA encontrou obrigação simulada de revisão documental laboral para empresas com equipas locais.', legalBasis: 'BOE — referência laboral simulada.', penalty: 'Risco de sanções administrativas e pedidos de documentação adicional.', source: 'BOE', sourceUrl: 'https://www.boe.es' },
];

const countryStyles: Record<string, string> = {
  Portugal: 'bg-emerald-400/15 text-emerald-100 border-emerald-300/30',
  França: 'bg-sky-400/15 text-sky-100 border-sky-300/30',
  Espanha: 'bg-amber-400/15 text-amber-100 border-amber-300/30',
  Alemanha: 'bg-violet-400/15 text-violet-100 border-violet-300/30',
  Itália: 'bg-rose-400/15 text-rose-100 border-rose-300/30',
  'União Europeia': 'bg-indigo-400/15 text-indigo-100 border-indigo-300/30',
};

const statusStyles: Record<ObligationStatus, string> = {
  Pendente: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  Concluído: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  Adiado: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
};

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function sameMonth(dateIso: string, current: Date) {
  const value = new Date(`${dateIso}T12:00:00`);
  return value.getFullYear() === current.getFullYear() && value.getMonth() === current.getMonth();
}

function safeRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readStoredArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

function notifyLocally(message: string) {
  try {
    const current = readStoredArray<{ id: string; message: string; type: string; createdAt: string; read: boolean }>(notificationsStorageKey);
    current.unshift({ id: safeRandomId(), message, type: 'calendar', createdAt: new Date().toISOString(), read: false });
    window.localStorage.setItem(notificationsStorageKey, JSON.stringify(current.slice(0, 30)));
  } catch {
    // Notification persistence must never break the compliance action itself.
  }
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function createObligationFromSuggestion(suggestion?: IntelligenceSuggestion): Obligation | null {
  if (suggestion?.source !== 'intelligence' || !suggestion.title) return null;

  return {
    id: `intel-${suggestion.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 42)}`,
    title: suggestion.title,
    country: suggestion.country || 'União Europeia',
    type: 'Governança',
    due: addDaysIso(30),
    owner: 'Compliance Lead',
    status: 'Pendente',
    description: suggestion.description || 'Sugestão criada a partir do RISCK COMPLY Intelligence para revisão interna.',
    legalBasis: 'RISCK COMPLY Intelligence — análise regulatória e tecnológica.',
    penalty: 'Risco de atraso na análise regulatória, evidências incompletas ou resposta operacional tardia.',
    source: 'RISCK COMPLY Intelligence',
    sourceUrl: '#',
  };
}

export default function ComplianceCalendarClient({ locale, canUseAiSearch, plan, suggestion }: { locale: string; canUseAiSearch: boolean; plan: string; suggestion?: IntelligenceSuggestion }) {
  const [obligations, setObligations] = useState<Obligation[]>(initialObligations);
  const [toast, setToast] = useState('');
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 4, 1));
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const saved = readStoredArray<Obligation>(storageKey);
    if (saved.length) {
      setObligations(saved);
    }
  }, []);

  useEffect(() => {
    const obligation = createObligationFromSuggestion(suggestion);
    if (!obligation) return;

    setObligations((items) => {
      if (items.some((item) => item.id === obligation.id)) {
        setToast('Esta sugestão do Jornal IA já está no calendário.');
        return items;
      }

      notifyLocally(`Sugestão do Jornal IA adicionada ao calendário: ${obligation.title}`);
      setToast('Sugestão do Jornal IA adicionada ao calendário inteligente.');
      setSelected(obligation);
      setCurrentMonth(new Date(`${obligation.due}T12:00:00`));
      return [...items, obligation];
    });
  }, [suggestion]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(obligations));
    } catch {
      setToast('Não foi possível guardar localmente este calendário neste navegador.');
    }
  }, [obligations]);

  const pendingCount = useMemo(() => obligations.filter((item) => item.status === 'Pendente').length, [obligations]);
  const monthEvents = useMemo(() => obligations.filter((item) => sameMonth(item.due, currentMonth)), [obligations, currentMonth]);
  const days = Array.from({ length: getDaysInMonth(currentMonth) }, (_, index) => index + 1);

  const setStatus = (id: string, status: ObligationStatus) => {
    const target = obligations.find((item) => item.id === id);
    if (!target) {
      setToast('Não foi possível encontrar esta obrigação. Atualize a página e tente novamente.');
      return;
    }

    const updatedTarget = { ...target, status };

    setObligations((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    setSelected((current) => (current?.id === id ? { ...current, status } : current));
    setToast(status === 'Concluído' ? 'Obrigação marcada como cumprida.' : 'Prazo adiado para revisão interna.');

    if (status === 'Concluído') {
      notifyLocally(`Obrigação cumprida: ${updatedTarget.title}`);
    }

    window.setTimeout(() => setSelected(null), 250);
  };

  const runAiSearch = () => {
    if (!canUseAiSearch) {
      setToast('A busca com IA exige o plano Professional ou superior.');
      return;
    }

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
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Acompanhe prazos por país, simule pesquisa em fontes oficiais e transforme obrigações cumpridas em evidência operacional.</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plano atual: {plan}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={runAiSearch} disabled={isSearching} className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-70">
              <Bot className="h-4 w-4" /> {isSearching ? 'IA a procurar...' : canUseAiSearch ? 'Buscar prazos com IA' : 'Desbloquear busca IA'}
            </button>
            {!canUseAiSearch ? (
              <Link href={`/${locale}/pricing`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-300/50 hover:bg-amber-300/10">Ver planos</Link>
            ) : null}
            <Link href={`/${locale}/auditoria`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-300/50 hover:bg-amber-300/10">Ver trilha de auditoria</Link>
          </div>
        </div>
        {!canUseAiSearch ? <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">O calendário básico está incluído no seu plano. A busca com IA em fontes oficiais, deteção automática de novos prazos e notificações inteligentes ficam disponíveis a partir do Professional.</p> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><CalendarDays className="h-5 w-5 text-amber-300" /><p className="mt-3 text-2xl font-semibold">{pendingCount}</p><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Prazos pendentes</p></div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><Clock3 className="h-5 w-5 text-amber-300" /><p className="mt-3 text-2xl font-semibold">{monthEvents.length}</p><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Eventos no mês</p></div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><Sparkles className="h-5 w-5 text-amber-300" /><p className="mt-3 text-2xl font-semibold">{canUseAiSearch ? 'Ativa' : 'Professional+'}</p><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Busca IA</p></div>
        </div>
      </div>

      {toast ? <div className="flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"><AlertTriangle className="h-4 w-4" /> {toast}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex gap-2"><button type="button" onClick={previousMonth} className="rounded-full border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Anterior</button><button type="button" onClick={nextMonth} className="rounded-full border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Seguinte</button></div>
          <div className="flex gap-2"><button type="button" onClick={() => setView('month')} className={`rounded-full px-3 py-2 text-sm ${view === 'month' ? 'bg-white text-slate-950' : 'border border-white/10'}`}>Mês</button><button type="button" onClick={() => setView('week')} className={`rounded-full px-3 py-2 text-sm ${view === 'week' ? 'bg-white text-slate-950' : 'border border-white/10'}`}>Semana</button></div>
          <div className="space-y-2 pt-2">{obligations.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-left text-sm hover:border-amber-300/40"><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-400">{item.country} · {item.due}</p><span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusStyles[item.status]}`}>{item.status}</span></button>)}</div>
        </aside>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold">{currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</h2>
          <div className="mt-5 grid grid-cols-7 gap-2">{days.map((day) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const iso = date.toISOString().slice(0, 10);
            const events = obligations.filter((item) => item.due === iso);
            return <div key={day} className="min-h-24 rounded-2xl border border-white/10 bg-slate-950/40 p-2"><p className="text-xs text-slate-500">{day}</p>{events.map((event) => <button key={event.id} type="button" onClick={() => setSelected(event)} className={`mt-2 w-full rounded-xl border px-2 py-1 text-left text-[11px] ${countryStyles[event.country] ?? 'border-white/10 bg-white/10 text-white'}`}>{event.title}</button>)}</div>;
          })}</div>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-amber-300">{selected.country} · {selected.type}</p>
                <h3 className="mt-2 text-2xl font-semibold">{selected.title}</h3>
                <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[selected.status]}`}>{selected.status}</span>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full border border-white/10 p-2 hover:bg-white/10" aria-label="Fechar detalhes"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <p>{selected.description}</p>
              <p><strong className="text-white">Base legal:</strong> {selected.legalBasis}</p>
              <p><strong className="text-white">Penalidade:</strong> {selected.penalty}</p>
              <p><strong className="text-white">Responsável:</strong> {selected.owner}</p>
              <Link href={selected.sourceUrl} target="_blank" className="inline-flex items-center gap-2 text-amber-200 hover:text-amber-100">{selected.source}<ExternalLink className="h-3 w-3" /></Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => setStatus(selected.id, 'Concluído')} disabled={selected.status === 'Concluído'} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> {selected.status === 'Concluído' ? 'Cumprido' : 'Marcar como cumprido'}</button>
              <button type="button" onClick={() => setStatus(selected.id, 'Adiado')} disabled={selected.status === 'Adiado'} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">{selected.status === 'Adiado' ? 'Revisão adiada' : 'Adiar revisão'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
