import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowDownRight, BarChart3, ShieldAlert } from 'lucide-react';

import { PlanGate } from '@/components/billing/plan-gate';
import { CreateRiskForm, type CreateRiskFormInput } from '@/components/risks/create-risk-form';
import { StepUpCsvExportButton } from '@/components/reports/step-up-csv-export-button';
import { DeleteRecordButton } from '@/components/shared/delete-record-button';
import { createRisk, deleteRisk } from '@/server/actions/risks';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { listRisks } from '@/server/queries/risks';

type RiskPageCopy = {
  eyebrow: string; title: string; subtitle: string; organization: string; metricsLabel: string;
  totalRisks: string; openRisks: string; criticalScore: string; averageScore: string;
  registerRisk: string; registerHelp: string; operationalRegister: string; liveRecords: string;
  empty: string; risk: string; category: string; likelihood: string; impact: string; score: string;
  status: string; action: string; noDescription: string; resourceName: string;
};

const riskPageCopy: Record<string, RiskPageCopy> = {
  en: { eyebrow: '{copy.eyebrow}', title: 'Risk register', subtitle: '{copy.subtitle}', organization: 'Organization', metricsLabel: 'Risk register metrics', totalRisks: 'Total risks', openRisks: 'Open risks', criticalScore: 'Critical score', averageScore: 'Average score', registerRisk: 'Register risk', registerHelp: 'Create a governed risk record with clear ownership and follow-up.', operationalRegister: 'Operational risk register', liveRecords: '{copy.liveRecords}', empty: '{copy.empty}', risk: 'Risk', category: 'Category', likelihood: 'Likelihood', impact: 'Impact', score: 'Score', status: 'Status', action: 'Action', noDescription: 'No description provided', resourceName: 'risk' },
  pt: { eyebrow: 'Registo de riscos enterprise', title: 'Registo de riscos', subtitle: 'Priorize riscos de compliance e operacionais por probabilidade, impacto, estado e acompanhamento responsável.', organization: 'Organização', metricsLabel: 'Métricas do registo de riscos', totalRisks: 'Total de riscos', openRisks: 'Riscos abertos', criticalScore: 'Pontuação crítica', averageScore: 'Pontuação média', registerRisk: 'Registar risco', registerHelp: 'Crie um registo de risco governado, com responsabilidade e acompanhamento claros.', operationalRegister: 'Registo de riscos operacional', liveRecords: 'Registos da organização ordenados pela pontuação de risco.', empty: 'Ainda não existem riscos registados.', risk: 'Risco', category: 'Categoria', likelihood: 'Probabilidade', impact: 'Impacto', score: 'Pontuação', status: 'Estado', action: 'Ação', noDescription: 'Sem descrição', resourceName: 'risco' },
  es: { eyebrow: 'Registro de riesgos enterprise', title: 'Registro de riesgos', subtitle: 'Prioriza riesgos operativos y de cumplimiento por probabilidad, impacto, estado y seguimiento responsable.', organization: 'Organización', metricsLabel: 'Métricas del registro de riesgos', totalRisks: 'Riesgos totales', openRisks: 'Riesgos abiertos', criticalScore: 'Puntuación crítica', averageScore: 'Puntuación media', registerRisk: 'Registrar riesgo', registerHelp: 'Crea un registro de riesgo gobernado con responsabilidad y seguimiento claros.', operationalRegister: 'Registro operativo de riesgos', liveRecords: 'Registros de la organización ordenados por puntuación de riesgo.', empty: 'Aún no se han registrado riesgos.', risk: 'Riesgo', category: 'Categoría', likelihood: 'Probabilidad', impact: 'Impacto', score: 'Puntuación', status: 'Estado', action: 'Acción', noDescription: 'Sin descripción', resourceName: 'riesgo' },
  fr: { eyebrow: 'Registre des risques enterprise', title: 'Registre des risques', subtitle: 'Priorisez les risques de conformité et opérationnels selon leur probabilité, impact, statut et suivi responsable.', organization: 'Organisation', metricsLabel: 'Indicateurs du registre des risques', totalRisks: 'Risques totaux', openRisks: 'Risques ouverts', criticalScore: 'Score critique', averageScore: 'Score moyen', registerRisk: 'Enregistrer un risque', registerHelp: 'Créez un risque gouverné avec une responsabilité et un suivi clairement définis.', operationalRegister: 'Registre opérationnel des risques', liveRecords: 'Enregistrements de l’organisation classés par score de risque.', empty: 'Aucun risque n’a encore été enregistré.', risk: 'Risque', category: 'Catégorie', likelihood: 'Probabilité', impact: 'Impact', score: 'Score', status: 'Statut', action: 'Action', noDescription: 'Aucune description', resourceName: 'risque' },
  it: { eyebrow: 'Registro rischi enterprise', title: 'Registro rischi', subtitle: 'Dai priorità ai rischi di conformità e operativi in base a probabilità, impatto, stato e follow-up responsabile.', organization: 'Organizzazione', metricsLabel: 'Metriche del registro rischi', totalRisks: 'Rischi totali', openRisks: 'Rischi aperti', criticalScore: 'Punteggio critico', averageScore: 'Punteggio medio', registerRisk: 'Registra rischio', registerHelp: 'Crea un rischio governato con responsabilità e follow-up chiari.', operationalRegister: 'Registro operativo dei rischi', liveRecords: 'Record dell’organizzazione ordinati per punteggio di rischio.', empty: 'Non sono ancora stati registrati rischi.', risk: 'Rischio', category: 'Categoria', likelihood: 'Probabilità', impact: 'Impatto', score: 'Punteggio', status: 'Stato', action: 'Azione', noDescription: 'Nessuna descrizione', resourceName: 'rischio' },
  de: { eyebrow: 'Enterprise-Risikoregister', title: 'Risikoregister', subtitle: 'Priorisieren Sie Compliance- und Betriebsrisiken nach Wahrscheinlichkeit, Auswirkung, Status und verantwortlicher Nachverfolgung.', organization: 'Organisation', metricsLabel: 'Kennzahlen des Risikoregisters', totalRisks: 'Risiken gesamt', openRisks: 'Offene Risiken', criticalScore: 'Kritischer Wert', averageScore: 'Durchschnittswert', registerRisk: 'Risiko erfassen', registerHelp: 'Erfassen Sie ein gesteuertes Risiko mit klarer Verantwortung und Nachverfolgung.', operationalRegister: 'Operatives Risikoregister', liveRecords: 'Organisationsdatensätze nach Risikowert sortiert.', empty: 'Es wurden noch keine Risiken erfasst.', risk: 'Risiko', category: 'Kategorie', likelihood: 'Wahrscheinlichkeit', impact: 'Auswirkung', score: 'Wert', status: 'Status', action: 'Aktion', noDescription: 'Keine Beschreibung', resourceName: 'Risiko' },
};

function getRiskScore(risk: { risk_score?: number | string | null; likelihood?: number | string | null; impact?: number | string | null }) {
  const explicitScore = Number(risk.risk_score ?? 0);
  if (Number.isFinite(explicitScore) && explicitScore > 0) return explicitScore;

  const likelihood = Number(risk.likelihood ?? 0);
  const impact = Number(risk.impact ?? 0);
  if (Number.isFinite(likelihood) && Number.isFinite(impact) && likelihood > 0 && impact > 0) return likelihood * impact;

  return 0;
}

function riskScoreTone(score: number) {
  if (score >= 15) return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  if (score >= 8) return 'border-amber-400/25 bg-amber-400/10 text-amber-300';
  return 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300';
}

function statusTone(status?: string | null) {
  const normalized = (status ?? 'open').toLowerCase();
  if (normalized === 'closed' || normalized === 'resolved') return 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300';
  if (normalized === 'mitigating' || normalized === 'in_progress') return 'border-blue-400/20 bg-blue-400/[0.07] text-blue-300';
  return 'border-slate-700 bg-slate-900/60 text-slate-400';
}

function numericValue(value?: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : '—';
}

export default async function OrganizationRisksPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${params.locale}/onboarding`);
  }

  const planCheck = await assertPlanAtLeast(organization.id, 'professional');
  if (!planCheck.ok) {
    redirect(`/${params.locale}/dashboard/organizations/billing?upgrade=professional&feature=risks`);
  }

  const [risks, billing] = await Promise.all([
    listRisks(organization.id),
    getOrganizationBillingContext(organization.id),
  ]);
  const dashboardBasePath = `/${params.locale}/dashboard/organizations`;
  const copy = riskPageCopy[params.locale] ?? riskPageCopy.en;
  const scoredRisks = risks.map((risk) => ({ risk, score: getRiskScore(risk) }));
  const openRisks = scoredRisks.filter(({ risk }) => !['closed', 'resolved'].includes(String(risk.status ?? 'open').toLowerCase())).length;
  const criticalRisks = scoredRisks.filter(({ score }) => score >= 15).length;
  const averageScore = scoredRisks.length > 0
    ? Math.round(scoredRisks.reduce((total, item) => total + item.score, 0) / scoredRisks.length)
    : 0;

  async function createRiskAction(input: CreateRiskFormInput) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    await createRisk({
      ...input,
      organizationId: currentOrganization.id,
    });

    revalidatePath(`/${params.locale}/dashboard/organizations/risks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function deleteRiskAction(riskId: string) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    await deleteRisk(riskId, currentOrganization.id);

    revalidatePath(`/${params.locale}/dashboard/organizations/risks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Enterprise risk register</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{copy.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Prioritize compliance and operational risks by likelihood, impact, status and accountable follow-up.</p>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">{copy.organization}: {organization.name}</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/risks.csv" filename="risks-report.csv" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-white disabled:opacity-60" />
        </header>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 lg:grid-cols-4" aria-label={copy.metricsLabel}>
          {[
            { label: copy.totalRisks, value: risks.length, icon: BarChart3 },
            { label: copy.openRisks, value: openRisks, icon: AlertTriangle },
            { label: copy.criticalScore, value: criticalRisks, icon: ShieldAlert },
            { label: copy.averageScore, value: averageScore, icon: ArrowDownRight },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#0d1624] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">{label}</p>
                <Icon className="h-4 w-4 text-blue-500/70" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6" aria-labelledby="new-risk-title">
          <div className="mb-5 border-b border-slate-800 pb-4">
            <h2 id="new-risk-title" className="text-sm font-semibold text-slate-100">{copy.registerRisk}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{copy.registerHelp}</p>
          </div>
          <PlanGate planId={billing.plan} metric="risks" currentUsage={billing.usage.risks} onUpgradeHref={`${dashboardBasePath}/billing`}>
            <CreateRiskForm onSubmit={createRiskAction} />
          </PlanGate>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-labelledby="risk-register-title">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
            <div>
              <h2 id="risk-register-title" className="text-sm font-semibold text-slate-100">{copy.operationalRegister}</h2>
              <p className="mt-1 text-xs text-slate-500">Live organization records ordered by risk score.</p>
            </div>
            <span className="rounded-md border border-slate-800 bg-[#0d1624] px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-400">{risks.length}</span>
          </div>

          {risks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500" role="status">No risks have been registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead className="bg-[#080e18]">
                  <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                    <th className="px-5 py-3 sm:px-6">{copy.risk}</th>
                    <th className="px-4 py-3">{copy.category}</th>
                    <th className="px-4 py-3 text-right">{copy.likelihood}</th>
                    <th className="px-4 py-3 text-right">{copy.impact}</th>
                    <th className="px-4 py-3 text-right">{copy.score}</th>
                    <th className="px-4 py-3">{copy.status}</th>
                    <th className="px-5 py-3 text-right sm:px-6">{copy.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {scoredRisks.map(({ risk, score }) => (
                    <tr key={risk.id} className="bg-[#0b121e] transition hover:bg-[#0e1827]">
                      <td className="px-5 py-4 sm:px-6">
                        <p className="max-w-[360px] truncate text-sm font-semibold text-slate-100">{risk.title}</p>
                        <p className="mt-1 max-w-[360px] truncate text-xs text-slate-600">{risk.description || copy.noDescription}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400">{risk.category || '—'}</td>
                      <td className="px-4 py-4 text-right font-mono text-xs tabular-nums text-slate-500">{numericValue(risk.likelihood)}</td>
                      <td className="px-4 py-4 text-right font-mono text-xs tabular-nums text-slate-500">{numericValue(risk.impact)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex min-w-12 justify-center rounded-md border px-2 py-1 font-mono text-xs font-semibold tabular-nums ${riskScoreTone(score)}`}>{score}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(risk.status)}`}>{risk.status ?? 'open'}</span>
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <DeleteRecordButton id={risk.id} label={risk.title} resourceName={copy.resourceName} onDelete={deleteRiskAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
