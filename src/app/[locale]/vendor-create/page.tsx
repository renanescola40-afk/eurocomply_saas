import { AuthenticatedProductShell } from '@/components/dashboard/authenticated-product-shell';
import { isSupportedLocale } from '@/lib/i18n/locales';
import { VendorActivationCard } from '../vendor-assurance/vendor-activation-card';

export default async function VendorCreatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';

  const content = (
    <div className="min-h-0 bg-transparent">
      <section className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">Create vendor record</h1>
        <div className="mt-6">
          <VendorActivationCard locale={locale} />
        </div>
      </section>
    </div>
  );

  return <AuthenticatedProductShell locale={locale}>{content}</AuthenticatedProductShell>;
}
