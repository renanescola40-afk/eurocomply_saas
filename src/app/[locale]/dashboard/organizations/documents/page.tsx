import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock3, FileStack, ShieldAlert } from 'lucide-react';

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

function statusTone(status: ReturnType<typeof documentStatusKey>) {
  if (status === 'approved') return 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300';
  if (status === 'review') return 'border-blue-400/20 bg-blue-400/[0.07] text-blue-300';
  if (status === 'rejected') return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  return 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300';
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
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
  const approvedDocuments = documents.filter((document) => documentStatusKey(document.status) === 'approved').length;
  const reviewDocuments = documents.filter((document) => documentStatusKey(document.status) === 'review').length;
  const expiringDocuments = documents.filter((document) => {
    if (!document.expires_at) return false;
    const expiresAt = new Date(document.expires_at).getTime();
    if (!Number.isFinite(expiresAt)) return false;
    const days = (expiresAt - Date.now()) / 86_400_000;
    return days >= 0 && days <= 30;
  }).length;

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
        <header className="border-b border-slate-800 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{copy.subtitle(currentOrganization.name)}</p>
        </header>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 lg:grid-cols-4" aria-label="Document register metrics">
          {[
            { label: 'Total records', value: documents.length, icon: FileStack },
            { label: 'Approved', value: approvedDocuments, icon: CheckCircle2 },
            { label: 'In review', value: reviewDocuments, icon: ShieldAlert },
            { label: 'Expiring ≤ 30d', value: expiringDocuments, icon: Clock3 },
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

        {canManageDocuments ? (
          <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6" aria-label="Upload compliance document">
            <PlanGate planId={billing.plan} metric="documents" currentUsage={billing.usage.documents} onUpgradeHref={`${dashboardBasePath}/billing`}>
              <CreateDocumentForm locale={params.locale} onSubmit={uploadDocumentAction} />
            </PlanGate>
          </section>
        ) : (
          <p className="rounded-xl border border-slate-800 bg-[#0b121e] p-4 text-sm text-slate-400" role="status">{readOnlyCopy[params.locale] ?? readOnlyCopy.en}</p>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-labelledby="document-register-title">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
            <div>
              <h2 id="document-register-title" className="text-sm font-semibold text-slate-100">{copy.registerTitle}</h2>
              <p className="mt-1 text-xs text-slate-500">{copy.records(documents.length)}</p>
            </div>
            <span className="rounded-md border border-slate-800 bg-[#0d1624] px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-400">{documents.length}</span>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center" role="status">
              <h2 className="text-base font-semibold text-slate-200">{copy.emptyTitle}</h2>
              <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-slate-500">{copy.emptyBody}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead className="bg-[#080e18]">
                  <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                    <th className="px-5 py-3 sm:px-6">Document</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-5 py-3 text-right sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {documents.map((document) => {
                    const title = document.title ?? copy.namePlaceholder;
                    const statusKey = documentStatusKey(document.status);
                    const status = copy.status[statusKey];
                    return (
                      <tr key={document.id} className="bg-[#0b121e] transition hover:bg-[#0e1827]">
                        <td className="px-5 py-4 sm:px-6">
                          <p className="max-w-[360px] truncate text-sm font-semibold text-slate-100">{title}</p>
                          <p className="mt-1 text-[11px] text-slate-600">{copy.version} v{document.version ?? 1}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-400">{document.category || '—'}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(statusKey)}`}>{status}</span>
                        </td>
                        <td className="px-4 py-4 font-mono text-[11px] tabular-nums text-slate-500">{formatDate(document.expires_at, params.locale)}</td>
                        <td className="px-4 py-4 font-mono text-[11px] tabular-nums text-slate-500">{formatDate(document.updated_at, params.locale)}</td>
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex flex-wrap justify-end gap-2">
                            <DocumentDownloadButton locale={params.locale} documentId={document.id} onCreateSignedUrl={createDownloadUrlAction} />
                            {canManageDocuments ? <DocumentDeleteButton locale={params.locale} documentId={document.id} documentName={title} onDelete={deleteDocumentAction} /> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
