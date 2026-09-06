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
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Risk register</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Prioritize compliance and operational risks by likelihood, impact, status and accountable follow-up.</p>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Organization: {organization.name}</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/risks.csv" filename="risks-report.csv" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-white disabled:opacity-60" />
        </header>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 lg:grid-cols-4" aria-label="Risk register metrics">
          {[
            { label: 'Total risks', value: risks.length, icon: BarChart3 },
            { label: 'Open risks', value: openRisks, icon: AlertTriangle },
            { label: 'Critical score', value: criticalRisks, icon: ShieldAlert },
            { label: 'Average score', value: averageScore, icon: ArrowDownRight },
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
            <h2 id="new-risk-title" className="text-sm font-semibold text-slate-100">Register risk</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Create a governed risk record. Existing plan limits and server-side actions remain unchanged.</p>
          </div>
          <PlanGate planId={billing.plan} metric="risks" currentUsage={billing.usage.risks} onUpgradeHref={`${dashboardBasePath}/billing`}>
            <CreateRiskForm onSubmit={createRiskAction} />
          </PlanGate>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-labelledby="risk-register-title">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
            <div>
              <h2 id="risk-register-title" className="text-sm font-semibold text-slate-100">Operational risk register</h2>
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
                    <th className="px-5 py-3 sm:px-6">Risk</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Likelihood</th>
                    <th className="px-4 py-3 text-right">Impact</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {scoredRisks.map(({ risk, score }) => (
                    <tr key={risk.id} className="bg-[#0b121e] transition hover:bg-[#0e1827]">
                      <td className="px-5 py-4 sm:px-6">
                        <p className="max-w-[360px] truncate text-sm font-semibold text-slate-100">{risk.title}</p>
                        <p className="mt-1 max-w-[360px] truncate text-xs text-slate-600">{risk.description || 'No description provided'}</p>
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
                        <DeleteRecordButton id={risk.id} label={risk.title} resourceName="risk" onDelete={deleteRiskAction} />
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
