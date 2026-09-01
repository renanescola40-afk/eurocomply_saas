import Image from 'next/image';
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
    <div className="min-h-screen bg-[#050913] text-white">
      <nav className="border-b border-slate-800/80 bg-[#08101c]/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} aria-label="RISCK COMPLY home" className="mr-3 inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={150} height={34} className="h-8 w-auto" />
          </Link>
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/65">Platform</span>
          <Link className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href={`/${locale}/platform`}>
            Control Center
          </Link>
          <Link className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-400/35 hover:bg-blue-500/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href={`/${locale}/platform/organizations/new`}>
            New tenant
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
