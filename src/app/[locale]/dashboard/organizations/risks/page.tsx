import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlanGate } from '@/components/billing/plan-gate';
import { CreateRiskForm, type CreateRiskFormInput } from '@/components/risks/create-risk-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createRisk } from '@/server/actions/risks';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { listRisks } from '@/server/queries/risks';

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

  async function createRiskAction(input: CreateRiskFormInput) {
    'use server';

    await createRisk(
      {
        ...input,
        organizationId: organization!.id,
      },
      user!.id,
    );

    revalidatePath(`/${params.locale}/dashboard/organizations/risks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-sm text-muted-foreground">{organization.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Risk register</h1>
        <p className="mt-2 text-muted-foreground">Prioritize compliance and operational risk by likelihood and impact.</p>
      </div>

      <PlanGate planId={billing.plan} metric="risks" currentUsage={billing.usage.risks}>
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
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="font-medium">{risk.title}</h2>
                      {risk.description && <p className="mt-1 text-sm text-muted-foreground">{risk.description}</p>}
                      {risk.category && <p className="mt-1 text-xs text-muted-foreground">Category: {risk.category}</p>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Score: {risk.risk_score ?? risk.likelihood * risk.impact}</p>
                      <p>Status: {risk.status}</p>
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
