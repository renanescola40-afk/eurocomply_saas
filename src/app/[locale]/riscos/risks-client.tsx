'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Risk = {
  id: string;
  title: string;
  probability: 'Baixa' | 'Média' | 'Alta';
  impact: 'Baixo' | 'Médio' | 'Alto';
  owner: string;
  action: string;
};

const defaultRisks: Risk[] = [
  { id: 'risk-1', title: 'Revisão de fornecedores atrasada', probability: 'Média', impact: 'Alto', owner: 'Legal', action: 'Atualizar DPAs e próxima data de revisão.' },
  { id: 'risk-2', title: 'Evidência de política sem aprovação', probability: 'Baixa', impact: 'Médio', owner: 'Compliance', action: 'Enviar política para workflow de aprovação.' },
];

const storageKey = 'eurocomply-risk-register-demo';

export function RisksClient({ locale }: { locale: string }) {
  const [risks, setRisks] = useState<Risk[]>(defaultRisks);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ title: '', probability: 'Média' as Risk['probability'], impact: 'Médio' as Risk['impact'], owner: '', action: '' });

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
    setForm({ title: '', probability: 'Média', impact: 'Médio', owner: '', action: '' });
    showToast('Risco adicionado e salvo localmente.');
  }

  function removeRisk(id: string) {
    setRisks((current) => current.filter((risk) => risk.id !== id));
    showToast('Risco removido do registro.');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-12">
      {toast ? <div className="fixed right-4 top-4 z-50 rounded-2xl border bg-background px-4 py-3 text-sm shadow-xl"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />{toast}</div> : null}

      <section className="rounded-[2rem] border bg-background/90 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-8">
        <Badge className="rounded-full uppercase tracking-[0.18em]">Risk register</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Matriz de Riscos</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">CRUD simulado para probabilidade, impacto, responsável e plano de ação. Persistência em localStorage para demo segura.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Riscos totais</p><p className="text-3xl font-semibold">{risks.length}</p></div>
          <div className="rounded-2xl border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Críticos</p><p className="text-3xl font-semibold">{criticalCount}</p></div>
          <div className="rounded-2xl border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">Próximo passo</p><Link className="font-medium text-primary" href={`/${locale}/aprovacoes`}>Enviar ações para aprovação</Link></div>
        </div>
      </section>

      <form onSubmit={addRisk} className="grid gap-3 rounded-[2rem] border bg-background/90 p-5 shadow-sm md:grid-cols-6">
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Título do risco" className="rounded-2xl border bg-background px-4 py-3 text-sm md:col-span-2" />
        <select value={form.probability} onChange={(event) => setForm({ ...form, probability: event.target.value as Risk['probability'] })} className="rounded-2xl border bg-background px-4 py-3 text-sm"><option>Baixa</option><option>Média</option><option>Alta</option></select>
        <select value={form.impact} onChange={(event) => setForm({ ...form, impact: event.target.value as Risk['impact'] })} className="rounded-2xl border bg-background px-4 py-3 text-sm"><option>Baixo</option><option>Médio</option><option>Alto</option></select>
        <input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="Responsável" className="rounded-2xl border bg-background px-4 py-3 text-sm" />
        <Button type="submit" className="rounded-full"><Plus className="h-4 w-4" />Adicionar</Button>
        <input value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })} placeholder="Plano de ação" className="rounded-2xl border bg-background px-4 py-3 text-sm md:col-span-6" />
      </form>

      <section className="grid gap-4">
        {risks.map((risk) => (
          <article key={risk.id} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold"><AlertTriangle className="mr-2 inline h-5 w-5 text-amber-500" />{risk.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Plano: {risk.action || 'Definir plano de ação'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Probabilidade: {risk.probability}</Badge>
                <Badge variant="outline">Impacto: {risk.impact}</Badge>
                <Badge>{risk.owner || 'Sem owner'}</Badge>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => showToast('Risco marcado para revisão executiva.')}><Save className="h-4 w-4" />Revisar</Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => removeRisk(risk.id)}><Trash2 className="h-4 w-4" />Excluir</Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
