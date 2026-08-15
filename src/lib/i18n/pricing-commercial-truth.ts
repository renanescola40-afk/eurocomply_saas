import type { CommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import type { Locale } from '@/lib/i18n/routing';

type PricingCopy = CommercialSurfaceCopy['pricing'];

type PricingCommercialTruth = {
  primaryCta: string;
  professionalCta: string;
  selfServeCheckout: string;
  trialQuestion: string;
  trialAnswer: string;
};

const truth: Record<Locale, PricingCommercialTruth> = {
  en: {
    primaryCta: 'Get started',
    professionalCta: 'Start Professional',
    selfServeCheckout: 'Self-serve checkout',
    trialQuestion: 'Do you offer a free trial?',
    trialAnswer: 'No free trial is currently offered. Essential and Professional use self-serve monthly checkout. Business and Enterprise start with assisted sales or a demo.',
  },
  pt: {
    primaryCta: 'Começar',
    professionalCta: 'Começar com Professional',
    selfServeCheckout: 'Checkout self-service',
    trialQuestion: 'Existe período de teste gratuito?',
    trialAnswer: 'Atualmente não disponibilizamos um período de teste gratuito. Essential e Professional usam checkout mensal self-service. Business e Enterprise começam com vendas assistidas ou uma demonstração.',
  },
  es: {
    primaryCta: 'Empezar',
    professionalCta: 'Empezar con Professional',
    selfServeCheckout: 'Checkout self-service',
    trialQuestion: '¿Ofrecéis una prueba gratuita?',
    trialAnswer: 'Actualmente no ofrecemos una prueba gratuita. Essential y Professional usan checkout mensual self-service. Business y Enterprise empiezan con ventas asistidas o una demo.',
  },
  fr: {
    primaryCta: 'Commencer',
    professionalCta: 'Commencer avec Professional',
    selfServeCheckout: 'Checkout en libre-service',
    trialQuestion: 'Proposez-vous un essai gratuit ?',
    trialAnswer: 'Aucun essai gratuit n’est actuellement proposé. Essential et Professional utilisent un checkout mensuel en libre-service. Business et Enterprise commencent par une vente assistée ou une démo.',
  },
  it: {
    primaryCta: 'Inizia',
    professionalCta: 'Inizia con Professional',
    selfServeCheckout: 'Checkout self-service',
    trialQuestion: 'Offrite una prova gratuita?',
    trialAnswer: 'Al momento non offriamo una prova gratuita. Essential e Professional usano il checkout mensile self-service. Business ed Enterprise iniziano con vendita assistita o demo.',
  },
  de: {
    primaryCta: 'Loslegen',
    professionalCta: 'Professional starten',
    selfServeCheckout: 'Self-Service-Checkout',
    trialQuestion: 'Bieten Sie eine kostenlose Testphase an?',
    trialAnswer: 'Derzeit wird keine kostenlose Testphase angeboten. Essential und Professional nutzen den monatlichen Self-Service-Checkout. Business und Enterprise starten mit vertriebsunterstützter Beratung oder einer Demo.',
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
