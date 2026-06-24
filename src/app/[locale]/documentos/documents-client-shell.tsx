'use client';

import dynamic from 'next/dynamic';

type InitialDocument = {
  id: string;
  title: string | null;
  status: string | null;
  version: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DocumentEntitlements = {
  plan: string;
  maxDocuments: number;
};

type DocumentsClientShellProps = {
  locale: string;
  initialDocuments?: InitialDocument[];
  entitlements?: DocumentEntitlements | null;
};

const DocumentsClient = dynamic<DocumentsClientShellProps>(() => import('./documents-client').then((mod) => mod.DocumentsClient), {
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

export function DocumentsClientShell(props: DocumentsClientShellProps) {
  return <DocumentsClient {...props} />;
}
