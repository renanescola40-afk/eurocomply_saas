import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PRICING = new URL('../../src/app/[locale]/pricing/page.tsx', import.meta.url);
const ENTERPRISE = new URL('../../src/app/[locale]/enterprise/page.tsx', import.meta.url);
const BOOK_DEMO = new URL('../../src/app/[locale]/book-demo/page.tsx', import.meta.url);
const CONTACT = new URL('../../src/app/[locale]/contact/page.tsx', import.meta.url);
const FRAME = new URL('../../src/components/marketing/public-commercial-route-v2.tsx', import.meta.url);
const STYLES = new URL('../../src/components/marketing/public-commercial-route-v2.module.css', import.meta.url);

const LAYOUTS = [
  ['pricing', new URL('../../src/app/[locale]/pricing/layout.tsx', import.meta.url)],
  ['enterprise', new URL('../../src/app/[locale]/enterprise/layout.tsx', import.meta.url)],
  ['book-demo', new URL('../../src/app/[locale]/book-demo/layout.tsx', import.meta.url)],
  ['contact', new URL('../../src/app/[locale]/contact/layout.tsx', import.meta.url)],
] as const;

describe('RISCK COMPLY UI V2 public commercial surfaces', () => {
  it('applies one official enterprise frame to pricing, enterprise, demo and contact routes', async () => {
    const [frame, css, ...layouts] = await Promise.all([
      readFile(FRAME, 'utf8'),
      readFile(STYLES, 'utf8'),
      ...LAYOUTS.map(([, url]) => readFile(url, 'utf8')),
    ]);

    expect(frame).toContain('data-public-commercial-v2={surface}');
    expect(css).toContain("url('/brand/risck-comply-wordmark.svg')");
    expect(css).toContain('display: none !important');
    expect(css).toContain('background: rgb(37 99 235) !important');
    expect(css).toContain("article[class*='from-emerald']");
    expect(css).toContain("[class*='text-cyan-']");

    for (const [index, [surface]] of LAYOUTS.entries()) {
      expect(layouts[index]).toContain('PublicCommercialRouteV2');
      expect(layouts[index]).toContain(`surface=\"${surface}\"`);
    }
  });

  it('preserves pricing catalog truth and commercial routing', async () => {
    const source = await readFile(PRICING, 'utf8');

    expect(source).toContain('BILLING_PLANS');
    expect(source).toContain("if (plan.id === 'enterprise') return `/${locale}/enterprise`");
    expect(source).toContain("if (plan.salesLed) return `/${locale}/book-demo?plan=${publicSlug}`");
    expect(source).toContain('applyPricingCommercialTruth');
    expect(source).toContain('PricingStructuredData');
  });

  it('preserves enterprise claims and sales-led buyer paths', async () => {
    const source = await readFile(ENTERPRISE, 'utf8');

    expect(source).toContain('/book-demo?plan=enterprise');
    expect(source).toContain('/security-questionnaire');
    expect(source).toContain('does not guarantee regulatory compliance');
    expect(source).toContain('<PublicFooter locale={locale} />');
  });

  it('preserves the demo workflow and contact channel while changing only route chrome', async () => {
    const [demo, contact] = await Promise.all([
      readFile(BOOK_DEMO, 'utf8'),
      readFile(CONTACT, 'utf8'),
    ]);

    expect(demo).toContain('<BookDemoForm locale={locale} />');
    expect(demo).toContain('<PublicFooter locale={locale} />');
    expect(contact).toContain("const mailto = `mailto:${contactMailbox}?subject=${encodeURIComponent(copy.subject)}`");
    expect(contact).toContain('href={mailto}');
    expect(contact).toContain('<PublicFooter locale={activeLocale} />');
  });
});
