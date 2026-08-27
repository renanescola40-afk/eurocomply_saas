import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlanGate } from '@/components/billing/plan-gate';
import { CreateRiskForm, type CreateRiskFormInput } from '@/components/risks/create-risk-form';
import { StepUpCsvExportButton } from '@/components/reports/step-up-csv-export-button';
import { DeleteRecordButton } from '@/components/shared/delete-record-button';
import { createRisk, deleteRisk } from '@/server/actions/risks';
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
  if (score >= 15) return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-100';
  if (score >= 8) return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100';
  return 'border-white/[0.08] bg-white/[0.025] text-white/62';
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

  const [risks, billing] = await Promise.all([
    listRisks(organization.id),
    getOrganizationBillingContext(organization.id),
  ]);
  const dashboardBasePath = `/${params.locale}/dashboard/organizations`;

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
        <header className="flex flex-col gap-4 border-b border-white/[0.065] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{organization.name}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Risk register</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Prioritize compliance and operational risk by likelihood and impact.</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/risks.csv" filename="risks-report.csv" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60" />
        </header>

        <PlanGate planId={billing.plan} metric="risks" currentUsage={billing.usage.risks} onUpgradeHref={`${dashboardBasePath}/billing`}>
          <CreateRiskForm onSubmit={createRiskAction} />
        </PlanGate>

        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="risk-register-title">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 id="risk-register-title" className="text-sm font-semibold text-white/88">Risks</h2>
              <p className="mt-1 text-xs text-white/38">Open and historical risks for this organization.</p>
            </div>
            <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-xs font-semibold text-white/52">{risks.length}</span>
          </div>

          {risks.length === 0 ? (
            <div className="p-6 text-sm text-white/45" role="status">No risks have been registered yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.055]">
              {risks.map((risk) => {
                const score = getRiskScore(risk);
                return (
                  <article key={risk.id} className="px-5 py-4 transition-colors hover:bg-white/[0.018]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-white/88">{risk.title}</h3>
                          {risk.category ? <span className="rounded-md border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-white/35">{risk.category}</span> : null}
                        </div>
                        {risk.description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-white/46">{risk.description}</p> : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${riskScoreTone(score)}`}>Score {score}</span>
                        <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-xs text-white/50">{risk.status ?? 'open'}</span>
                        <DeleteRecordButton id={risk.id} label={risk.title} resourceName="risk" onDelete={deleteRiskAction} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
