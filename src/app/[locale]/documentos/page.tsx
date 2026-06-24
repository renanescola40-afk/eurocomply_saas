import { unstable_noStore as noStore } from 'next/cache';
import nextDynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { listDocuments } from '@/server/queries/documents';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const DocumentsClient = nextDynamic(() => import('./documents-client').then((mod) => mod.DocumentsClient), {
  loading: () => <DocumentsClientSkeleton />,
});

function DocumentsClientSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-12" aria-label="A carregar documentos">
      <div className="rounded-[2rem] border bg-background/90 p-6 shadow-xl shadow-primary/5 md:p-8">
        <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
        <div className="mt-5 h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-muted" />
        <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded-full bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[1.5rem] border bg-background/90 p-5 shadow-sm">
            <div className="h-6 w-2/3 animate-pulse rounded-full bg-muted" />
            <div className="mt-4 h-4 w-1/2 animate-pulse rounded-full bg-muted" />
            <div className="mt-6 flex gap-2">
              <div className="h-10 w-28 animate-pulse rounded-full bg-muted" />
              <div className="h-10 w-24 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  noStore();

  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const documents = organization ? await listDocuments(organization.id, { pageSize: 50 }) : [];
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage="Evidence & Risk" />
      <DocumentsClient locale={locale} initialDocuments={documents} entitlements={entitlements} />
    </main>
  );
}
