import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale } from '@/lib/i18n/locales';
import { VendorActivationCard } from '../vendor-assurance/vendor-activation-card';

export default async function VendorCreatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';

  return (
    <main className="min-h-screen bg-background">
      <DashboardCommandNavigation locale={locale} />
      <section className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-4xl font-semibold tracking-tight">Create vendor record</h1>
        <div className="mt-6">
          <VendorActivationCard locale={locale} />
        </div>
      </section>
    </main>
  );
}
