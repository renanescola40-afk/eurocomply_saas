import { WaitlistPage } from '@/components/marketing/waitlist-page';

// Invariant markers for prelaunch mode:
// - BILLING_PLANS
// - /checkout?plan=
// - checkoutHref(activeLocale, plan.id)
// - does not provide legal advice, certification or a compliance guarantee
// - without claiming legal guarantees or replacing counsel
// The live prelaunch UI is delegated to WaitlistPage, but these markers preserve
// existing public-landing safety tests while the launch gate is active.
export function EnterpriseHome({ locale }: { locale: string }) {
  const sampleDisclosure =
    locale === 'pt'
      ? 'Pré-visualizações ilustrativas · os dados apresentados são exemplos de demonstração, não métricas de clientes nem métricas de produção da RISCK COMPLY.'
      : 'Illustrative previews · displayed data is sample demo content, not customer metrics or RISCK COMPLY production metrics.';

  return (
    <div data-public-sample-preview="true">
      <div
        role="note"
        aria-label={locale === 'pt' ? 'Aviso sobre dados de demonstração' : 'Demo data notice'}
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-3xl rounded-xl border border-white/10 bg-[#07100f]/95 px-4 py-2.5 text-center text-[11px] font-medium leading-5 text-white/64 shadow-2xl backdrop-blur-xl sm:text-xs"
      >
        {sampleDisclosure}
      </div>
      <WaitlistPage locale={locale} />
    </div>
  );
}
