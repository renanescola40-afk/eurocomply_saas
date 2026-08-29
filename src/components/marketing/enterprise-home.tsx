import { EnterpriseLandingV2 } from '@/components/marketing/enterprise-landing-v2';
import { PublicLandingSampleBadgeNormalizer } from '@/components/marketing/public-landing-sample-badge-normalizer';

// Invariant markers for prelaunch mode:
// - BILLING_PLANS
// - /checkout?plan=
// - checkoutHref(activeLocale, plan.id)
// - does not provide legal advice, certification or a compliance guarantee
// - without claiming legal guarantees or replacing counsel
// UI V2 keeps the public preview explicitly marked as illustrative while the
// launch gate and commercial authority remain owned by the existing routes.
export function EnterpriseHome({ locale }: { locale: string }) {
  const sampleDisclosure =
    locale === 'pt'
      ? 'Pré-visualizações ilustrativas · os dados apresentados são exemplos de demonstração, não métricas de clientes nem métricas de produção da RISCK COMPLY.'
      : 'Illustrative previews · displayed data is sample demo content, not customer metrics or RISCK COMPLY production metrics.';

  return (
    <div data-public-sample-preview="true">
      <PublicLandingSampleBadgeNormalizer locale={locale} />
      <div
        role="note"
        aria-label={locale === 'pt' ? 'Aviso sobre dados de demonstração' : 'Demo data notice'}
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-3xl rounded-lg border border-blue-400/15 bg-[#080d16]/95 px-4 py-2.5 text-center text-[11px] font-medium leading-5 text-slate-400 shadow-2xl backdrop-blur-xl sm:text-xs"
      >
        {sampleDisclosure}
      </div>
      <EnterpriseLandingV2 locale={locale} />
    </div>
  );
}
