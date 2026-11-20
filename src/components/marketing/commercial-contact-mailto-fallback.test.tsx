import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CommercialContactMailtoFallback } from './commercial-contact-mailto-fallback';

describe('privacy-safe assisted commercial contact', () => {
  it('renders a direct demo email without collecting personal fields', () => {
    const html = renderToStaticMarkup(<CommercialContactMailtoFallback intent="demo" />);

    expect(html).toContain('mailto:comercial@risckcomply.com?subject=RISCK%20COMPLY%20demo%20request');
    expect(html).toContain('Privacy Policy is under review');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
    expect(html).toContain('does not confirm a meeting');
  });

  it('renders a sales-specific direct email without implied account activation', () => {
    const html = renderToStaticMarkup(<CommercialContactMailtoFallback intent="sales" />);

    expect(html).toContain('mailto:comercial@risckcomply.com?subject=RISCK%20COMPLY%20commercial%20enquiry');
    expect(html).toContain('does not confirm a meeting, activate an account or create a subscription');
    expect(html).not.toContain('<form');
  });

  it('gates both public form routes on the actual effective Privacy publication state', async () => {
    const demo = await readFile(new URL('../../app/[locale]/book-demo/page.tsx', import.meta.url), 'utf8');
    const contact = await readFile(new URL('../../app/[locale]/contact/page.tsx', import.meta.url), 'utf8');

    for (const page of [demo, contact]) {
      const guard = page.indexOf('const publicLeadCaptureEnabled = isEffectivePublicLegalPublication(PUBLIC_PRIVACY_PUBLICATION)');
      const conditional = page.indexOf('{publicLeadCaptureEnabled');

      expect(guard).toBeGreaterThan(-1);
      expect(conditional).toBeGreaterThan(guard);
      expect(page).toContain('CommercialContactMailtoFallback');
    }
    expect(demo).toContain('<BookDemoForm locale={locale} planIntent={planIntent} />');
    expect(contact).toContain('<SalesContactForm');
  });
});
