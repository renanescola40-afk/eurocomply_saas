import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('public commercial acquisition contract', () => {
  it('keeps the demo agenda aligned with the canonical no-trial pricing truth', () => {
    const demoPage = read('src/app/[locale]/book-demo/page.tsx');
    const pricingTruth = read('src/lib/i18n/pricing-commercial-truth.ts');

    expect(pricingTruth).toContain('No free trial is currently offered.');
    expect(demoPage).not.toContain('pricing motion: trial');
    expect(demoPage).toContain('commercial fit: self-service checkout, Business-assisted motion or Enterprise review');
  });

  it('qualifies demo demand around operational AI governance instead of generic GRC', () => {
    const form = read('src/components/marketing/book-demo-form.tsx');

    for (const intent of [
      'AI system inventory and ownership',
      'AI risk assessment and review',
      'Evidence and audit trail readiness',
      'Vendor AI risk and procurement',
      'AI policies and governance workflows',
      'EU AI Act readiness and transparency duties',
    ]) {
      expect(form).toContain(intent);
    }

    expect(form).not.toContain('GDPR / privacy evidence');
    expect(form).not.toContain('Controlled documents');
    expect(form).toContain('data-cta-id="book-demo-submit"');
  });

  it('keeps the runtime acquisition taxonomy aligned with the 14 prepared PostHog Actions', () => {
    const events = read('src/lib/analytics/events.ts');

    for (const event of [
      'landing_view',
      'pricing_view',
      'feature_view',
      'trust_view',
      'resource_view',
      'cta_clicked',
      'demo_started',
      'demo_submitted',
      'document_downloaded',
      'newsletter_subscribed',
      'user_signed_up',
      'checkout_started',
      'checkout_completed',
      'subscription_active',
    ]) {
      expect(events).toContain(`'${event}'`);
    }

    expect(events).not.toContain("trialBannerViewed: 'trial_banner_viewed'");
  });

  it('requires public acquisition capture to remain consent gated', () => {
    const clientEffects = read('src/components/GlobalClientEffects.tsx');
    const posthogClient = read('src/lib/analytics/posthog-client.ts');

    expect(clientEffects).toContain('isMarketingCaptureAllowed()');
    expect(clientEffects).toContain('ANALYTICS_CONSENT_GRANTED_EVENT');
    expect(posthogClient).toContain("risckcomply:analytics-consent-granted");
    expect(posthogClient).toContain("opt_out_capturing_by_default: isAnalyticsConsentRequired()");
  });
});
