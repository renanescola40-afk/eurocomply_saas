import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const CONTACT = new URL('../../src/app/[locale]/contact/page.tsx', import.meta.url);
const FORM = new URL('../../src/components/marketing/sales-contact-form.tsx', import.meta.url);

describe('sales contact CTA', () => {
  it('uses an internal form instead of relying on mailto', async () => {
    const [page, form] = await Promise.all([readFile(CONTACT, 'utf8'), readFile(FORM, 'utf8')]);

    expect(page).toContain('href="#sales-contact-form"');
    expect(page).toContain('<SalesContactForm');
    expect(page).toContain("intent={intent ?? 'sales'}");
    expect(page).toContain("plan={plan || 'enterprise'}");
    expect(page).not.toContain('mailto:');

    expect(form).toContain('id="sales-contact-form"');
    expect(form).toContain("fetch('/api/leads'");
    expect(form).toContain('\`intent=\${intent}\`');
    expect(form).toContain('\`plan=\${plan}\`');
    expect(form).toContain("source: \`contact-sales-\${plan}\`");
  });

  it('renders the required enterprise sales fields and explicit consent', async () => {
    const form = await readFile(FORM, 'utf8');

    expect(form).toContain('name="fullName"');
    expect(form).toContain('name="workEmail"');
    expect(form).toContain('name="companyName"');
    expect(form).toContain('name="role"');
    expect(form).toContain('name="companySize"');
    expect(form).toContain('name="region"');
    expect(form).toContain('name="message"');
    expect(form).toContain('name="consentToContact"');
    expect(form).toContain('required type="checkbox"');
  });

  it('keeps Portuguese and English UX and does not auto-submit', async () => {
    const [page, form] = await Promise.all([readFile(CONTACT, 'utf8'), readFile(FORM, 'utf8')]);

    expect(page).toContain("emailLabel: 'Abrir formulário comercial'");
    expect(page).toContain("emailLabel: 'Open sales form'");
    expect(form).toContain("'Enviar pedido comercial'");
    expect(form).toContain("'Send sales request'");
    expect(form).toContain('onSubmit={handleSubmit}');
    expect(form).not.toContain('useEffect(');
  });
});
