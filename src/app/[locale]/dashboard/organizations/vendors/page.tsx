import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlanGate } from '@/components/billing/plan-gate';
import { CreateVendorForm, type CreateVendorFormInput } from '@/components/vendors/create-vendor-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { listVendors } from '@/server/queries/vendors';
import { createVendor } from '@/server/actions/vendors';

export default async function OrganizationVendorsPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const current = await getCurrentOrganizationForUser(user.id);

  if (!current) {
    redirect(`/${params.locale}/onboarding`);
  }

  const [vendors, billing] = await Promise.all([
    listVendors(current.organization.id),
    getOrganizationBillingContext(current.organization.id),
  ]);

  async function handleCreateVendor(input: CreateVendorFormInput) {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect(`/${params.locale}/login`);

    const current = await getCurrentOrganizationForUser(user.id);
    if (!current) redirect(`/${params.locale}/onboarding`);

    await createVendor({ organizationId: current.organization.id, ...input }, user.id);

    revalidatePath(`/${params.locale}/dashboard/organizations/vendors`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Third-party risk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Vendors</h1>
          <p className="mt-3 max-w-2xl text-white/55">Manage suppliers, subprocessors and third parties that touch compliance-sensitive data.</p>
        </div>

        <PlanGate planId={billing.plan} metric="vendors" currentUsage={billing.usage.vendors}>
          <CreateVendorForm onCreate={handleCreateVendor} />
        </PlanGate>

        <Card className="border-white/10 bg-white/[0.03] text-white">
          <CardHeader>
            <CardTitle>Vendor register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendors.length === 0 ? (
              <p className="text-sm text-white/55">No vendors yet. Add the first vendor to start tracking third-party risk.</p>
            ) : (
              vendors.map((vendor: any) => (
                <div key={vendor.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="font-medium text-white">{vendor.name}</h2>
                      <p className="text-sm text-white/50">{vendor.category ?? 'Uncategorized'} · {vendor.country ?? 'No country'}</p>
                    </div>
                    <div className="flex gap-2 text-xs uppercase tracking-wide text-white/65">
                      <span className="rounded-full border border-white/10 px-2 py-1">{vendor.risk_level ?? 'medium'} risk</span>
                      <span className="rounded-full border border-white/10 px-2 py-1">{vendor.review_status ?? 'pending'}</span>
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
