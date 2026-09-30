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
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Third-party risk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Vendors</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Manage suppliers, subprocessors and third parties that touch compliance-sensitive data.</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/vendors.csv" filename="vendors-report.csv" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-medium text-slate-300 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white disabled:opacity-60" />
        </header>

        <PlanGate planId={billing.plan} metric="vendors" currentUsage={billing.usage.vendors} onUpgradeHref={`${dashboardBasePath}/billing`}>
          <CreateVendorForm onCreate={handleCreateVendor} />
        </PlanGate>

        <Card className="rounded-xl border-slate-800 bg-[#0b121e] text-white shadow-none">
          <CardHeader className="border-b border-slate-800 px-5 py-4 sm:px-6">
            <CardTitle className="text-sm font-semibold text-slate-100">Vendor register</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vendors.length === 0 ? (
              <div className="p-8 text-center" role="status">
                <h2 className="text-sm font-semibold text-slate-100">Add the first vendor to activate third-party assurance.</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Start with the most important SaaS, cloud or AI provider. One vendor is enough to make procurement risk visible in the dashboard.
                </p>
                <div className="mx-auto mt-5 grid max-w-3xl gap-3 text-left text-sm text-slate-400 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">Review DPA status</div>
                  <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">Classify risk level</div>
                  <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">Assign next review</div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="px-5 py-4 transition hover:bg-[#0e1827] sm:px-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-100">{vendor.name}</h2>
                        <p className="mt-1 text-xs text-slate-500">{vendor.category ?? 'Uncategorized'} · {vendor.country ?? 'No country'}</p>
                      </div>
                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          <span className="rounded-md border border-slate-800 bg-[#0d1624] px-2 py-1">{vendor.risk_level ?? 'medium'} risk</span>
                          <span className="rounded-md border border-slate-800 bg-[#0d1624] px-2 py-1">{vendor.review_status ?? 'pending'}</span>
                        </div>
                        <DeleteRecordButton id={vendor.id} label={vendor.name} resourceName="vendor" onDelete={handleDeleteVendor} />
                      </div>
                    </div>
                    {vendor.website && <p className="mt-3 text-xs text-slate-600">{vendor.website}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
