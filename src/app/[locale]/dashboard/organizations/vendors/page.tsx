import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlanGate } from '@/components/billing/plan-gate';
import { DeleteRecordButton } from '@/components/shared/delete-record-button';
import { StepUpCsvExportButton } from '@/components/reports/step-up-csv-export-button';
import { CreateVendorForm, type CreateVendorFormInput } from '@/components/vendors/create-vendor-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { listVendors } from '@/server/queries/vendors';
import { createVendor, deleteVendor } from '@/server/actions/vendors';

export default async function OrganizationVendorsPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const current = await getCurrentOrganizationForUser(user.id);

  if (!current) {
    redirect(`/${params.locale}/onboarding`);
  }

  const planCheck = await assertPlanAtLeast(current.id, 'professional');
  if (!planCheck.ok) {
    redirect(`/${params.locale}/dashboard/organizations/billing?upgrade=professional&feature=vendors`);
  }

  const [vendors, billing] = await Promise.all([
    listVendors(current.id),
    getOrganizationBillingContext(current.id),
  ]);
  const dashboardBasePath = `/${params.locale}/dashboard/organizations`;

  async function handleCreateVendor(input: CreateVendorFormInput): Promise<{ error?: string }> {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect(`/${params.locale}/login`);

    const current = await getCurrentOrganizationForUser(user.id);
    if (!current) redirect(`/${params.locale}/onboarding`);

    try {
      await createVendor({ organizationId: current.id, ...input });
      revalidatePath(`/${params.locale}/dashboard/organizations/vendors`);
      revalidatePath(`/${params.locale}/dashboard/organizations`);
      return {};
    } catch (error) {
      console.error('[vendors] Failed to create vendor', { error: error instanceof Error ? error.name : 'unknown' });
      return {
        error: error instanceof Error ? error.message : 'Não foi possível criar o fornecedor agora.',
      };
    }
  }

  async function handleDeleteVendor(vendorId: string) {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect(`/${params.locale}/login`);

    const current = await getCurrentOrganizationForUser(user.id);
    if (!current) redirect(`/${params.locale}/onboarding`);

    await deleteVendor(vendorId, current.id);

    revalidatePath(`/${params.locale}/dashboard/organizations/vendors`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">Third-party risk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Vendors</h1>
            <p className="mt-3 max-w-2xl text-white/55">Manage suppliers, subprocessors and third parties that touch compliance-sensitive data.</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/vendors.csv" filename="vendors-report.csv" className="inline-flex h-10 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-medium hover:bg-white/10 disabled:opacity-60" />
        </div>

        <PlanGate planId={billing.plan} metric="vendors" currentUsage={billing.usage.vendors} onUpgradeHref={`${dashboardBasePath}/billing`}>
          <CreateVendorForm onCreate={handleCreateVendor} />
        </PlanGate>

        <Card className="border-white/10 bg-white/[0.03] text-white">
          <CardHeader>
            <CardTitle>Vendor register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendors.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 p-7 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Add the first vendor to activate third-party assurance.</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/55">
                  Start with the most important SaaS, cloud or AI provider. One vendor is enough to make procurement risk visible in the dashboard.
                </p>
                <div className="mt-5 grid gap-3 text-left text-sm text-white/60 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">Review DPA status</div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">Classify risk level</div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">Assign next review</div>
                </div>
              </div>
            ) : (
              vendors.map((vendor) => (
                <div key={vendor.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="font-medium text-white">{vendor.name}</h2>
                      <p className="text-sm text-white/50">{vendor.category ?? 'Uncategorized'} · {vendor.country ?? 'No country'}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <div className="flex gap-2 text-xs uppercase tracking-wide text-white/65">
                        <span className="rounded-full border border-white/10 px-2 py-1">{vendor.risk_level ?? 'medium'} risk</span>
                        <span className="rounded-full border border-white/10 px-2 py-1">{vendor.review_status ?? 'pending'}</span>
                      </div>
                      <DeleteRecordButton id={vendor.id} label={vendor.name} resourceName="vendor" onDelete={handleDeleteVendor} />
                    </div>
                  </div>
                  {vendor.website && <p className="mt-3 text-sm text-white/45">{vendor.website}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
