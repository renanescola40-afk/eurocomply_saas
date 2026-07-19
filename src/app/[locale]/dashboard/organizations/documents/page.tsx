import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlanGate } from '@/components/billing/plan-gate';
import { CreateDocumentForm, type UploadDocumentFormInput } from '@/components/documents/create-document-form';
import { DocumentDeleteButton } from '@/components/documents/document-delete-button';
import { DocumentDownloadButton } from '@/components/documents/document-download-button';
import { createDocumentSignedDownloadUrl } from '@/server/actions/document-downloads';
import { deleteDocument, uploadDocument } from '@/server/actions/documents';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { listDocuments } from '@/server/queries/documents';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function formatDocumentStatus(status: string | null | undefined) {
  const normalized = String(status ?? 'pending').toLowerCase();
  if (normalized.includes('approved') || normalized.includes('aprovado')) return 'Approved';
  if (normalized.includes('review') || normalized.includes('revis')) return 'In review';
  if (normalized.includes('reject') || normalized.includes('rejeit')) return 'Rejected';
  return 'Pending';
}

export default async function OrganizationDocumentsPage({ params }: { params: { locale: string } }) {
  noStore();

  const user = await getCurrentUser();
  if (!user) redirect(`/${params.locale}/login`);

  const currentOrganization = await getCurrentOrganizationForUser(user.id);
  if (!currentOrganization) redirect(`/${params.locale}/onboarding`);

  const documents = await listDocuments(currentOrganization.id);
  const billing = await getOrganizationBillingContext(currentOrganization.id);
  const dashboardBasePath = `/${params.locale}/dashboard/organizations`;

  async function uploadDocumentAction(input: UploadDocumentFormInput) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);

    const organization = await getCurrentOrganizationForUser(currentUser.id);
    if (!organization) redirect(`/${params.locale}/onboarding`);

    await uploadDocument({
      organizationId: organization.id,
      name: input.name,
      category: input.category,
      expiresAt: input.expiresAt,
    }, input.file);

    revalidatePath(`/${params.locale}/dashboard/organizations/documents`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function createDownloadUrlAction(documentId: string) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);

    const organization = await getCurrentOrganizationForUser(currentUser.id);
    if (!organization) redirect(`/${params.locale}/onboarding`);

    return createDocumentSignedDownloadUrl(documentId);
  }

  async function deleteDocumentAction(documentId: string) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);

    const organization = await getCurrentOrganizationForUser(currentUser.id);
    if (!organization) redirect(`/${params.locale}/onboarding`);

    await deleteDocument(documentId, organization.id);
    revalidatePath(`/${params.locale}/dashboard/organizations/documents`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Documents</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Compliance documents</h1>
          <p className="mt-4 max-w-2xl text-white/58">Track policies, DPIAs, vendor agreements and audit evidence files for {currentOrganization.name}.</p>
        </header>

        <PlanGate planId={billing.plan} metric="documents" currentUsage={billing.usage.documents} onUpgradeHref={`${dashboardBasePath}/billing`}>
          <CreateDocumentForm onSubmit={uploadDocumentAction} />
        </PlanGate>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Document register</h2>
            <p className="text-sm text-white/50">{documents.length} document records</p>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 p-7 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Add the first document to activate this workspace.</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/55">Upload one useful file so the dashboard can show real progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => {
                const title = document.title ?? 'Untitled compliance document';
                const status = formatDocumentStatus(document.status);
                return (
                  <article key={document.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-medium text-white">{title}</h3>
                        <p className="mt-1 text-sm text-white/50">Version v{document.version ?? 1} · {status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <DocumentDownloadButton documentId={document.id} onCreateSignedUrl={createDownloadUrlAction} />
                        <DocumentDeleteButton documentId={document.id} documentName={title} onDelete={deleteDocumentAction} />
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
