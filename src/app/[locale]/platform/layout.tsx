import Link from 'next/link';

export default async function PlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-[#050505]">
      <nav className="border-b border-white/10 bg-black/70 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <span className="mr-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Platform</span>
          <Link className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/25 hover:text-white" href={`/${locale}/platform`}>
            Control Center
          </Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/25 hover:text-white" href={`/${locale}/platform/organizations/new`}>
            New tenant
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
