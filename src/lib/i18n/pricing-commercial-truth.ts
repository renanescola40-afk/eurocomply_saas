import type { CommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import type { Locale } from '@/lib/i18n/routing';

type PricingCopy = CommercialSurfaceCopy['pricing'];

type PricingCommercialTruth = {
  primaryCta: string;
  professionalCta: string;
  selfServeCheckout: string;
  trialQuestion: string;
  trialAnswer: string;
  taxNote: string;
};

const truth: Record<Locale, PricingCommercialTruth> = {
  en: {
    primaryCta: 'Get started',
    professionalCta: 'Start Professional',
    selfServeCheckout: 'Self-serve checkout',
    trialQuestion: 'Do you offer a free trial?',
    trialAnswer: 'No free trial is currently offered. Essential and Professional use self-serve monthly checkout. Business and Enterprise start with assisted sales or a demo.',
    taxNote: 'Prices are shown in EUR. Any applicable taxes or VAT depend on the customer and transaction facts and are reflected only after the applicable fiscal or contractual treatment has been established. Business is assisted-sales; Enterprise uses negotiated contract pricing.',
  },
  pt: {
    primaryCta: 'Começar',
    professionalCta: 'Começar com Professional',
    selfServeCheckout: 'Checkout self-service',
    trialQuestion: 'Existe período de teste gratuito?',
    trialAnswer: 'Atualmente não disponibilizamos um período de teste gratuito. Essential e Professional usam checkout mensal self-service. Business e Enterprise começam com vendas assistidas ou uma demonstração.',
    taxNote: 'Os preços são apresentados em EUR. Eventuais impostos ou IVA dependem dos factos do cliente e da transação e só são refletidos depois de estabelecido o tratamento fiscal ou contratual aplicável. Business é assistido por vendas; Enterprise usa preços negociados por contrato.',
  },
  es: {
    primaryCta: 'Empezar',
    professionalCta: 'Empezar con Professional',
    selfServeCheckout: 'Checkout self-service',
    trialQuestion: '¿Ofrecéis una prueba gratuita?',
    trialAnswer: 'Actualmente no ofrecemos una prueba gratuita. Essential y Professional usan checkout mensual self-service. Business y Enterprise empiezan con ventas asistidas o una demo.',
    taxNote: 'Los precios se muestran en EUR. Los impuestos o el IVA que puedan corresponder dependen de los datos del cliente y de la transacción y solo se reflejan una vez establecido el tratamiento fiscal o contractual aplicable. Business es asistido; Enterprise usa precios negociados.',
  },
  fr: {
    primaryCta: 'Commencer',
    professionalCta: 'Commencer avec Professional',
    selfServeCheckout: 'Checkout en libre-service',
    trialQuestion: 'Proposez-vous un essai gratuit ?',
    trialAnswer: 'Aucun essai gratuit n’est actuellement proposé. Essential et Professional utilisent un checkout mensuel en libre-service. Business et Enterprise commencent par une vente assistée ou une démo.',
    taxNote: 'Les prix sont affichés en EUR. Les taxes ou la TVA éventuellement applicables dépendent des éléments propres au client et à la transaction et ne sont reflétées qu’après détermination du traitement fiscal ou contractuel applicable. Business est assisté ; Enterprise est négocié.',
  },
  it: {
    primaryCta: 'Inizia',
    professionalCta: 'Inizia con Professional',
    selfServeCheckout: 'Checkout self-service',
    trialQuestion: 'Offrite una prova gratuita?',
    trialAnswer: 'Al momento non offriamo una prova gratuita. Essential e Professional usano il checkout mensile self-service. Business ed Enterprise iniziano con vendita assistita o demo.',
    taxNote: 'I prezzi sono espressi in EUR. Eventuali imposte o IVA dipendono dai dati del cliente e della transazione e vengono riflessi solo dopo che è stato stabilito il trattamento fiscale o contrattuale applicabile. Business è assistito; Enterprise usa prezzi negoziati.',
  },
  de: {
    primaryCta: 'Loslegen',
    professionalCta: 'Professional starten',
    selfServeCheckout: 'Self-Service-Checkout',
    trialQuestion: 'Bieten Sie eine kostenlose Testphase an?',
    trialAnswer: 'Derzeit wird keine kostenlose Testphase angeboten. Essential und Professional nutzen den monatlichen Self-Service-Checkout. Business und Enterprise starten mit vertriebsunterstützter Beratung oder einer Demo.',
    taxNote: 'Preise werden in EUR angezeigt. Etwaige Steuern oder Mehrwertsteuer hängen von den Kunden- und Transaktionsdaten ab und werden erst berücksichtigt, nachdem die anwendbare steuerliche oder vertragliche Behandlung feststeht. Business ist vertriebsunterstützt; Enterprise wird verhandelt.',
  },
};

export function getPricingCommercialTruth(locale: Locale) {
  return truth[locale] ?? truth.en;
}

export function applyPricingCommercialTruth(locale: Locale, base: PricingCopy): PricingCopy {
  const commercialTruth = getPricingCommercialTruth(locale);
  const trialFaqIndex = 1;

  return {
    ...base,
    // Compatibility fields retain their historic names, but the public values now reflect
    // the actual checkout motion. No trial is granted by the current billing catalog.
    startTrial: commercialTruth.primaryCta,
    startProfessional: commercialTruth.professionalCta,
    selfServeTrial: commercialTruth.selfServeCheckout,
    // The historic locale catalog said checkout confirmed tax/VAT treatment. The current
    // checkout only collects billing/tax identity data, so public copy must stay fail-closed
    // until an attributable fiscal/contractual treatment has actually been established.
    taxNote: commercialTruth.taxNote,
    plan: {
      ...base.plan,
      professional: {
        ...base.plan.professional,
        cta: commercialTruth.professionalCta,
      },
    },
    faqs: base.faqs.map((faq, index) => (
      index === trialFaqIndex
        ? { question: commercialTruth.trialQuestion, answer: commercialTruth.trialAnswer }
        : faq
    )),
  };
}
