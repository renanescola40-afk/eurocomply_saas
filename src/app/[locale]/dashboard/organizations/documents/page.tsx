import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlanGate } from '@/components/billing/plan-gate';
import { CreateDocumentForm, type UploadDocumentFormInput } from '@/components/documents/create-document-form';
import { DocumentDeleteButton } from '@/components/documents/document-delete-button';
import { DocumentDownloadButton } from '@/components/documents/document-download-button';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';
import { roleHasPermission } from '@/lib/security/permissions';
import { createDocumentSignedDownloadUrl } from '@/server/actions/document-downloads';
import { deleteDocument, uploadDocument } from '@/server/actions/documents';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { listDocuments } from '@/server/queries/documents';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const readOnlyCopy: Record<string, string> = {
  en: 'Your role can review and download compliance documents but cannot upload or delete them.',
  pt: 'A sua função pode consultar e descarregar documentos de compliance, mas não pode carregar ou eliminar documentos.',
  es: 'Tu rol puede consultar y descargar documentos de compliance, pero no puede subirlos ni eliminarlos.',
  fr: 'Votre rôle peut consulter et télécharger les documents de conformité, mais ne peut pas les téléverser ou les supprimer.',
  it: 'Il tuo ruolo può consultare e scaricare i documenti di compliance, ma non può caricarli o eliminarli.',
  de: 'Ihre Rolle kann Compliance-Dokumente einsehen und herunterladen, aber nicht hochladen oder löschen.',
};

function documentStatusKey(status: string | null | undefined) {
  const normalized = String(status ?? 'pending').toLowerCase();
  if (normalized.includes('approved') || normalized.includes('aprovado')) return 'approved' as const;
  if (normalized.includes('review') || normalized.includes('revis')) return 'review' as const;
  if (normalized.includes('reject') || normalized.includes('rejeit')) return 'rejected' as const;
  return 'pending' as const;
}

export default async function OrganizationDocumentsPage({ params }: { params: { locale: string } }) {
  noStore();

  const user = await getCurrentUser();
  if (!user) redirect(`/${params.locale}/login`);

  const currentOrganization = await getCurrentOrganizationForUser(user.id);
  if (!currentOrganization) redirect(`/${params.locale}/onboarding`);

  const copy = getCoreWorkflowCopy(params.locale).documents;
  const documents = await listDocuments(currentOrganization.id);
  const billing = await getOrganizationBillingContext(currentOrganization.id);
  const dashboardBasePath = `/${params.locale}/dashboard/organizations`;
  const canManageDocuments = roleHasPermission(currentOrganization.role, 'manage_documents');

  async function uploadDocumentAction(input: UploadDocumentFormInput) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);
    const organization = await getCurrentOrganizationForUser(currentUser.id);
    if (!organization) redirect(`/${params.locale}/onboarding`);

    await uploadDocument({ organizationId: organization.id, name: input.name, category: input.category, expiresAt: input.expiresAt }, input.file);
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
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-white/[0.065] pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{copy.subtitle(currentOrganization.name)}</p>
        </header>

        {canManageDocuments ? (
          <PlanGate planId={billing.plan} metric="documents" currentUsage={billing.usage.documents} onUpgradeHref={`${dashboardBasePath}/billing`}>
            <CreateDocumentForm locale={params.locale} onSubmit={uploadDocumentAction} />
          </PlanGate>
        ) : (
          <p className="rounded-xl border border-white/[0.075] bg-[#101715] p-4 text-sm text-white/62" role="status">{readOnlyCopy[params.locale] ?? readOnlyCopy.en}</p>
        )}

        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="document-register-title">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 id="document-register-title" className="text-sm font-semibold text-white/88">{copy.registerTitle}</h2>
              <p className="mt-1 text-xs text-white/38">{copy.records(documents.length)}</p>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="p-6" role="status">
              <h2 className="text-base font-semibold text-white/80">{copy.emptyTitle}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">{copy.emptyBody}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.055]">
              {documents.map((document) => {
                const title = document.title ?? copy.namePlaceholder;
                const status = copy.status[documentStatusKey(document.status)];
                return (
                  <article key={document.id} className="px-5 py-4 transition-colors hover:bg-white/[0.018]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words font-medium text-white/88">{title}</h3>
                        <p className="mt-1 text-xs text-white/40">{copy.version} v{document.version ?? 1} · {status}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                        <DocumentDownloadButton locale={params.locale} documentId={document.id} onCreateSignedUrl={createDownloadUrlAction} />
                        {canManageDocuments ? <DocumentDeleteButton locale={params.locale} documentId={document.id} documentName={title} onDelete={deleteDocumentAction} /> : null}
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
