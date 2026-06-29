import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlanGate } from '@/components/billing/plan-gate';
import { CreateRiskForm, type CreateRiskFormInput } from '@/components/risks/create-risk-form';
import { DeleteRecordButton } from '@/components/shared/delete-record-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{organization.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Risk register</h1>
          <p className="mt-2 text-muted-foreground">Prioritize compliance and operational risk by likelihood and impact.</p>
        </div>
        <Link href="/api/reports/risks.csv" className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Export CSV
        </Link>
      </div>

      <PlanGate planId={billing.plan} metric="risks" currentUsage={billing.usage.risks} onUpgradeHref={`${dashboardBasePath}/billing`}>
        <CreateRiskForm onSubmit={createRiskAction} />
      </PlanGate>

      <Card>
        <CardHeader>
          <CardTitle>Risks</CardTitle>
          <CardDescription>Open and historical risks for this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No risks have been registered yet.</p>
          ) : (
            <div className="space-y-3">
              {risks.map((risk) => (
                <div key={risk.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="font-medium">{risk.title}</h2>
                      {risk.description && <p className="mt-1 text-sm text-muted-foreground">{risk.description}</p>}
                      {risk.category && <p className="mt-1 text-xs text-muted-foreground">Category: {risk.category}</p>}
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground md:items-end">
                      <div className="text-right">
                        <p>Score: {getRiskScore(risk)}</p>
                        <p>Status: {risk.status ?? 'open'}</p>
                      </div>
                      <DeleteRecordButton id={risk.id} label={risk.title} resourceName="risk" onDelete={deleteRiskAction} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
