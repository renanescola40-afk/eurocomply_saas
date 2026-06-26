import Link from 'next/link';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale } from '@/lib/i18n/locales';
import { VendorActivationCard } from '../vendor-activation-card';

export default async function VendorCreatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} />
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6">
          <Link href={`/${locale}/vendor-assurance`} className="text-sm text-muted-foreground hover:text-foreground">
            Back to vendor assurance
          </Link>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Create vendor record</h1>
          <p className="mt-3 text-muted-foreground">
            This privacy-safe activation flow records vendor creation without capturing supplier names, contracts or evidence details.
          </p>
        </div>
        <VendorActivationCard locale={locale} />
      </section>
    </main>
  );
}
