import { revalidatePath } from 'next/cache';
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

export default async function OrganizationDocumentsPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const currentOrganization = await getCurrentOrganizationForUser(user.id);

  if (!currentOrganization) {
    redirect(`/${params.locale}/onboarding`);
  }

  const documents = await listDocuments(currentOrganization.organization.id);
  const billing = await getOrganizationBillingContext(currentOrganization.organization.id);

  async function uploadDocumentAction(input: UploadDocumentFormInput) {
    'use server';

    const user = await getCurrentUser();

    if (!user) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(user.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    await uploadDocument(
      {
        organizationId: currentOrganization.organization.id,
        name: input.name,
        category: input.category,
        expiresAt: input.expiresAt,
      },
      input.file,
      user.id,
    );

    revalidatePath(`/${params.locale}/dashboard/organizations/documents`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function createDownloadUrlAction(documentId: string) {
    'use server';

    const user = await getCurrentUser();

    if (!user) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(user.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    return createDocumentSignedDownloadUrl(documentId, currentOrganization.organization.id, user.id);
  }

  async function deleteDocumentAction(documentId: string) {
    'use server';

    const user = await getCurrentUser();

    if (!user) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(user.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    await deleteDocument(documentId, currentOrganization.organization.id, user.id);
    revalidatePath(`/${params.locale}/dashboard/organizations/documents`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Documents</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Compliance documents</h1>
          <p className="mt-4 max-w-2xl text-white/58">
            Track policies, DPIAs, vendor agreements and audit evidence files for {currentOrganization.organization.name}.
          </p>
        </header>

        <PlanGate planId={billing.plan} metric="documents" currentUsage={billing.usage.documents}>
          <CreateDocumentForm onSubmit={uploadDocumentAction} />
        </PlanGate>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Document register</h2>
              <p className="text-sm text-white/50">{documents.length} document records</p>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/50">
              No documents registered yet. Upload your first compliance document to start building audit evidence.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <article key={document.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-medium text-white">{document.name}</h3>
                      <p className="mt-1 text-sm text-white/50">{document.category} · {document.status}</p>
                      <p className="mt-2 text-xs text-white/35">{document.mime_type ?? 'Unknown type'} · {document.size_bytes ?? 0} bytes</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      {document.expires_at && (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                          Expires {document.expires_at}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <DocumentDownloadButton documentId={document.id} onCreateSignedUrl={createDownloadUrlAction} />
                        <DocumentDeleteButton documentId={document.id} documentName={document.name} onDelete={deleteDocumentAction} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
