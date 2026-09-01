import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PRICING = new URL('../../src/app/[locale]/pricing/page.tsx', import.meta.url);
const ENTERPRISE = new URL('../../src/app/[locale]/enterprise/page.tsx', import.meta.url);
const BOOK_DEMO_PAGE = new URL('../../src/app/[locale]/book-demo/page.tsx', import.meta.url);
const BOOK_DEMO_FORM = new URL('../../src/components/marketing/book-demo-form.tsx', import.meta.url);
const DYNAMIC_TRUST = new URL('../../src/components/trust/trust-page.tsx', import.meta.url);

describe('RISCK COMPLY commercial UI V2 consistency', () => {
  it('preserves pricing commercial authority while removing legacy promotional chrome', async () => {
    const source = await readFile(PRICING, 'utf8');

    expect(source).toContain('BILLING_PLANS');
    expect(source).toContain('applyPricingCommercialTruth');
    expect(source).toContain('PricingStructuredData');
    expect(source).toContain('planHref(locale, plan)');
    expect(source).toContain("if (plan.id === 'enterprise') return `/${locale}/enterprise`");
    expect(source).toContain("if (plan.salesLed) return `/${locale}/book-demo?plan=${publicSlug}`");
    expect(source).toContain("return `/${locale}/signup?plan=${publicSlug}`");
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('bg-violet-500/[0.055]');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('bg-gradient-to-b');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('rounded-[1.75rem]');
  });

  it('preserves enterprise routes and non-claims while using cobalt and amber semantics', async () => {
    const source = await readFile(ENTERPRISE, 'utf8');

    expect(source).toContain('/book-demo?plan=enterprise');
    expect(source).toContain('/security-questionnaire');
    expect(source).toContain('does not guarantee regulatory compliance');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('bg-amber-300/[0.055]');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('text-emerald-100');
  });

  it('keeps demo demand capture and analytics while aligning page and form to graphite/cobalt', async () => {
    const [page, form] = await Promise.all([readFile(BOOK_DEMO_PAGE, 'utf8'), readFile(BOOK_DEMO_FORM, 'utf8')]);

    expect(page).toContain('<BookDemoForm locale={locale} />');
    expect(page).toContain('/brand/risck-comply-wordmark.svg');
    expect(page).toContain('bg-[#050913]');
    expect(page).not.toContain('radial-gradient');
    expect(page).not.toContain('tech-grid');

    expect(form).toContain("fetch('/api/leads'");
    expect(form).toContain('analyticsEvents.demoStarted');
    expect(form).toContain('analyticsEvents.demoSubmitted');
    expect(form).toContain("consentToContact: formData.get('consentToContact') === 'on'");
    expect(form).toContain('bg-blue-600');
    expect(form).toContain('bg-emerald-400/10');
    expect(form).toContain('bg-red-400/10');
    expect(form).not.toContain('rounded-[2rem]');
    expect(form).not.toContain('rounded-full');
  });

  it('keeps dynamic Trust localization and legal publication truth while using neutral assurance chrome', async () => {
    const source = await readFile(DYNAMIC_TRUST, 'utf8');

    expect(source).toContain('getLocalizedTrustCenterPages(locale)');
    expect(source).toContain('getLegalPublicationState()');
    expect(source).toContain('ProviderRuntimeDisclosure');
    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('bg-blue-500/[0.06]');
    expect(source).toContain('bg-amber-300/[0.055]');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('tech-grid');
    expect(source).not.toContain('bg-emerald-300/[0.055]');
  });
});
