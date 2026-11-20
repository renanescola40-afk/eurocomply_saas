import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const componentSourceUrl = new URL('./commercial-contact-mailto-fallback.tsx', import.meta.url);

describe('privacy-safe assisted commercial contact', () => {
  it('keeps the JSX fallback parsable and shows demo/sales mailto actions without a form', async () => {
    const component = await readFile(componentSourceUrl, 'utf8');
    const transpiled = ts.transpileModule(component, {
      fileName: 'commercial-contact-mailto-fallback.tsx',
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    });

    expect((transpiled.diagnostics ?? []).filter((diagnostic) => (
      diagnostic.category === ts.DiagnosticCategory.Error
    ))).toEqual([]);
    expect(component).toContain("const SALES_EMAIL = 'comercial@risckcomply.com'");
    expect(component).toContain("const subject = isDemo ? 'RISCK COMPLY demo request' : 'RISCK COMPLY commercial enquiry'");
    expect(component).toContain('const mailto = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}`');
    expect(component).toContain('href={mailto}');
    expect(component).not.toMatch(/<(?:form|input|textarea)(?:\s|>)/i);
  });

  it('discloses the privacy limitation without implying a meeting or account activation', async () => {
    const component = await readFile(componentSourceUrl, 'utf8');

    expect(component).toContain('Privacy Policy is under review');
    expect(component).toContain('Sending an email does not confirm a meeting, activate an account or create a subscription.');
    expect(component).toContain('Please avoid sending confidential records or sensitive documents');
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
