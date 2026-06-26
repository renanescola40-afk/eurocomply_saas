'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { analyticsEvents, captureAnalyticsEvent } from '@/lib/analytics/posthog-client';
import type { PlanEntitlements } from '@/server/billing/entitlements';

type Risk = {
  id: string;
  title: string;
  probability: 'Baixa' | 'Média' | 'Alta';
  impact: 'Baixo' | 'Médio' | 'Alto';
  owner: string;
  action: string;
};

type RiskEntitlements = PlanEntitlements | null;

const defaultRisks: Risk[] = [
  { id: 'risk-1', title: 'Revisão de fornecedores atrasada', probability: 'Média', impact: 'Alto', owner: 'Legal', action: 'Atualizar DPAs e próxima data de revisão.' },
  { id: 'risk-2', title: 'Evidência de política sem aprovação', probability: 'Baixa', impact: 'Médio', owner: 'Compliance', action: 'Enviar política para workflow de aprovação.' },
];

const storageKey = 'eurocomply-risk-register-demo';

export function RisksClient({ locale, entitlements }: { locale: string; entitlements: RiskEntitlements }) {
  const [risks, setRisks] = useState<Risk[]>(defaultRisks);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ title: '', probability: 'Média' as Risk['probability'], impact: 'Médio' as Risk['impact'], owner: '', action: '' });
  const advancedRiskMatrix = entitlements?.riskMatrix === 'advanced' || entitlements?.riskMatrix === 'enterprise';
  const approvalWorkflows = entitlements?.approvalWorkflows ?? false;
  const planName = entitlements?.plan ? entitlements.plan.charAt(0).toUpperCase() + entitlements.plan.slice(1) : 'Essential';

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setRisks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(risks));
  }, [risks]);

  const criticalCount = useMemo(() => risks.filter((risk) => risk.impact === 'Alto' && risk.probability === 'Alta').length, [risks]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function addRisk(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      showToast('Informe o título do risco antes de adicionar.');
      return;
    }
    setRisks((current) => [{ id: crypto.randomUUID(), ...form }, ...current]);
    captureAnalyticsEvent(analyticsEvents.riskCreated, {
      source: 'risk_register',
      locale,
    });
    setForm({ title: '', probability: 'Média', impact: 'Médio', owner: '', action: '' });
    showToast(advancedRiskMatrix ? 'Risco adicionado ao registro avançado.' : 'Risco adicionado ao registro básico.');
  }

  function removeRisk(id: string) {
    setRisks((current) => current.filter((risk) => risk.id !== id));
    showToast('Risco removido do registro.');
  }

  function requestExecutiveReview() {
    if (!approvalWorkflows) {
      showToast('Workflows de aprovação exigem o plano Business ou superior.');
      return;
    }

    showToast('Risco marcado para revisão executiva.');
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-[2rem] border bg-background/85 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Plano {planName}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Matriz de riscos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Registe riscos, responsáveis e planos de mitigação. Planos Professional+ desbloqueiam uma matriz mais completa; Business+ adiciona workflows.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 p-4 text-center"><p className="text-2xl font-bold">{risks.length}</p><p className="text-xs text-muted-foreground">Riscos</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4 text-center"><p className="text-2xl font-bold">{criticalCount}</p><p className="text-xs text-muted-foreground">Críticos</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4 text-center"><p className="text-2xl font-bold">{advancedRiskMatrix ? 'Avançado' : 'Básico'}</p><p className="text-xs text-muted-foreground">Modo</p></div>
          </div>
        </div>

        {!advancedRiskMatrix ? (
          <div className="mt-6 rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            A matriz avançada de riscos fica disponível no plano Business. O plano atual mantém um registro básico para começar sem perder controlo.
            <Button asChild variant="outline" className="ml-0 mt-3 rounded-full sm:ml-3 sm:mt-0"><Link href={`/${locale}/pricing`}>Ver planos</Link></Button>
          </div>
        ) : null}

        {toast ? <div className="mt-5 rounded-2xl border bg-primary/10 p-3 text-sm text-primary">{toast}</div> : null}

        <form onSubmit={addRisk} className="mt-8 grid gap-3 rounded-3xl border bg-muted/20 p-4 md:grid-cols-[1fr_160px_160px_180px]">
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título do risco" className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          <select value={form.probability} onChange={(event) => setForm((current) => ({ ...current, probability: event.target.value as Risk['probability'] }))} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"><option>Baixa</option><option>Média</option><option>Alta</option></select>
          <select value={form.impact} onChange={(event) => setForm((current) => ({ ...current, impact: event.target.value as Risk['impact'] }))} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"><option>Baixo</option><option>Médio</option><option>Alto</option></select>
          <Button type="submit" className="rounded-full"><Plus className="h-4 w-4" />Adicionar</Button>
          <input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} placeholder="Responsável" className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2" />
          <input value={form.action} onChange={(event) => setForm((current) => ({ ...current, action: event.target.value }))} placeholder="Ação de mitigação" className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2" />
        </form>

        <div className="mt-8 grid gap-4">
          {risks.map((risk) => (
            <article key={risk.id} className="rounded-3xl border bg-background p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">{risk.title}</h2></div>
                  <p className="mt-2 text-sm text-muted-foreground">Responsável: {risk.owner || 'Não atribuído'}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{risk.action || 'Sem ação definida.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Probabilidade: {risk.probability}</Badge>
                  <Badge variant="outline">Impacto: {risk.impact}</Badge>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={requestExecutiveReview}><CheckCircle2 className="h-4 w-4" />Revisar</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => showToast('Alterações guardadas localmente.')}><Save className="h-4 w-4" />Guardar</Button>
                <Button type="button" variant="ghost" className="rounded-full text-destructive" onClick={() => removeRisk(risk.id)}><Trash2 className="h-4 w-4" />Remover</Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
