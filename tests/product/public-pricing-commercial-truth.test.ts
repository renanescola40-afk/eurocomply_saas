import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getCommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { applyPricingCommercialTruth, getPricingCommercialTruth } from '@/lib/i18n/pricing-commercial-truth';
import { locales } from '@/lib/i18n/routing';

const pricingPage = readFileSync(join(process.cwd(), 'src/app/[locale]/pricing/page.tsx'), 'utf8');
const commercialCatalog = JSON.parse(
  readFileSync(join(process.cwd(), 'config/billing-commercial-catalog.json'), 'utf8'),
) as Record<string, unknown>;

describe('public pricing commercial truth', () => {
  it('uses the explicit commercial-truth layer on the public pricing route', () => {
    expect(pricingPage).toContain('applyPricingCommercialTruth(locale, getCommercialSurfaceCopy(locale).pricing)');
  });

  it('does not advertise a trial when the canonical commercial catalog has no trial contract', () => {
    const catalogText = JSON.stringify(commercialCatalog).toLowerCase();
    expect(catalogText).not.toContain('trial_period');
    expect(catalogText).not.toContain('trial_days');
    expect(catalogText).not.toContain('free_trial');

    for (const locale of locales) {
      const truth = getPricingCommercialTruth(locale);
      const copy = applyPricingCommercialTruth(locale, getCommercialSurfaceCopy(locale).pricing);

      expect(copy.startTrial).toBe(truth.primaryCta);
      expect(copy.startProfessional).toBe(truth.professionalCta);
      expect(copy.plan.professional.cta).toBe(truth.professionalCta);
      expect(copy.selfServeTrial).toBe(truth.selfServeCheckout);
      expect(copy.faqs[1]).toEqual({
        question: truth.trialQuestion,
        answer: truth.trialAnswer,
      });

      expect(copy.startTrial.toLowerCase()).not.toMatch(/trial|teste|prueba|essai|prova|testphase|test starten/);
      expect(copy.startProfessional.toLowerCase()).not.toMatch(/trial|teste|prueba|essai|prova|testphase|test starten/);
      expect(copy.selfServeTrial.toLowerCase()).toMatch(/checkout/);
    }
  });

  it('answers the trial FAQ as an explicit current limitation instead of a sales promise', () => {
    const expectedNegations: Record<(typeof locales)[number], RegExp> = {
      en: /no free trial is currently offered/i,
      pt: /não disponibilizamos um período de teste gratuito/i,
      es: /no ofrecemos una prueba gratuita/i,
      fr: /aucun essai gratuit n’est actuellement proposé/i,
      it: /non offriamo una prova gratuita/i,
      de: /keine kostenlose testphase angeboten/i,
    };

    for (const locale of locales) {
      const copy = applyPricingCommercialTruth(locale, getCommercialSurfaceCopy(locale).pricing);
      expect(copy.faqs[1]?.answer).toMatch(expectedNegations[locale]);
    }
  });
});
