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
    primaryCta: 'Request Access',
    professionalCta: 'Request Access',
    selfServeCheckout: 'Assisted onboarding',
    trialQuestion: 'Do you offer a free trial?',
    trialAnswer: 'No free trial is currently offered. Essential and Professional currently start with a demo request and assisted onboarding, subject to contract, security and billing checks. Business and Enterprise are also sales-led.',
    taxNote: 'Prices are shown in EUR. Any applicable taxes or VAT depend on the customer and transaction facts and are reflected only after the applicable fiscal or contractual treatment has been established. Business is assisted-sales; Enterprise uses negotiated contract pricing.',
  },
  pt: {
    primaryCta: 'Pedir acesso',
    professionalCta: 'Pedir acesso',
    selfServeCheckout: 'Ativação assistida',
    trialQuestion: 'Existe período de teste gratuito?',
    trialAnswer: 'Atualmente não disponibilizamos um período de teste gratuito. Essential e Professional começam com um pedido de demonstração e ativação assistida, sujeito a verificações contratuais, de segurança e faturação. Business e Enterprise também são assistidos.',
    taxNote: 'Os preços são apresentados em EUR. Eventuais impostos ou IVA dependem dos factos do cliente e da transação e só são refletidos depois de estabelecido o tratamento fiscal ou contratual aplicável. Business é assistido por vendas; Enterprise usa preços negociados por contrato.',
  },
  es: {
    primaryCta: 'Solicitar acceso',
    professionalCta: 'Solicitar acceso',
    selfServeCheckout: 'Activación asistida',
    trialQuestion: '¿Ofrecéis una prueba gratuita?',
    trialAnswer: 'Actualmente no ofrecemos una prueba gratuita. Essential y Professional comienzan mediante una solicitud de demostración y activación asistida, sujetas a verificaciones contractuales, de seguridad y facturación. Business y Enterprise también son asistidos.',
    taxNote: 'Los precios se muestran en EUR. Los impuestos o el IVA que puedan corresponder dependen de los datos del cliente y de la transacción y solo se reflejan una vez establecido el tratamiento fiscal o contractual aplicable. Business es asistido; Enterprise usa precios negociados.',
  },
  fr: {
    primaryCta: 'Demander un accès',
    professionalCta: 'Demander un accès',
    selfServeCheckout: 'Activation accompagnée',
    trialQuestion: 'Proposez-vous un essai gratuit ?',
    trialAnswer: 'Aucun essai gratuit n’est actuellement proposé. Essential et Professional commencent par une demande de démonstration et une activation accompagnée, sous réserve de vérifications contractuelles, de sécurité et de facturation. Business et Enterprise suivent aussi un parcours assisté.',
    taxNote: 'Les prix sont affichés en EUR. Les taxes ou la TVA éventuellement applicables dépendent des éléments propres au client et à la transaction et ne sont reflétées qu’après détermination du traitement fiscal ou contractuel applicable. Business est assisté ; Enterprise est négocié.',
  },
  it: {
    primaryCta: 'Richiedi accesso',
    professionalCta: 'Richiedi accesso',
    selfServeCheckout: 'Attivazione assistita',
    trialQuestion: 'Offrite una prova gratuita?',
    trialAnswer: 'Al momento non offriamo una prova gratuita. Essential e Professional iniziano con una richiesta di demo e attivazione assistita, previa verifica contrattuale, di sicurezza e fatturazione. Anche Business ed Enterprise seguono un percorso assistito.',
    taxNote: 'I prezzi sono espressi in EUR. Eventuali imposte o IVA dipendono dai dati del cliente e della transazione e vengono riflessi solo dopo che è stato stabilito il trattamento fiscale o contrattuale applicabile. Business è assistito; Enterprise usa prezzi negoziati.',
  },
  de: {
    primaryCta: 'Zugang anfragen',
    professionalCta: 'Zugang anfragen',
    selfServeCheckout: 'Betreute Aktivierung',
    trialQuestion: 'Bieten Sie eine kostenlose Testphase an?',
    trialAnswer: 'Derzeit wird keine kostenlose Testphase angeboten. Essential und Professional starten mit einer Demoanfrage und betreuter Aktivierung, vorbehaltlich Vertrags-, Sicherheits- und Abrechnungsprüfung. Business und Enterprise werden ebenfalls betreut.',
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
    // Compatibility fields retain historic names; the public pricing route now requests
    // assisted onboarding. No trial or automatic activation is promised.
    startTrial: commercialTruth.primaryCta,
    startProfessional: commercialTruth.professionalCta,
    selfServeTrial: commercialTruth.selfServeCheckout,
    selfServe: commercialTruth.selfServeCheckout,
    // The historic locale catalog said checkout confirmed tax/VAT treatment. The current
    // checkout only collects billing/tax identity data, so public copy must stay fail-closed
    // until an attributable fiscal/contractual treatment has actually been established.
    taxNote: commercialTruth.taxNote,
    plan: {
      ...base.plan,
      starter: {
        ...base.plan.starter,
        cta: commercialTruth.primaryCta,
      },
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
