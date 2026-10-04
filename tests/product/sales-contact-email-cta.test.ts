import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const CONTACT = new URL('../../src/app/[locale]/contact/page.tsx', import.meta.url);

describe('sales contact email CTA', () => {
  it('uses a native mailto anchor and preserves intent + plan context', async () => {
    const source = await readFile(CONTACT, 'utf8');

    expect(source).toContain("plan?: string | string[]");
    expect(source).toContain("const plan = first(resolvedSearchParams.plan)?.trim()");
    expect(source).toContain("const subject = plan ? \`\${copy.subject} — \${plan}\` : copy.subject");
    expect(source).toContain("\`intent=\${intent ?? 'sales'}\`");
    expect(source).toContain("\`plan=\${plan ?? 'not-specified'}\`");
    expect(source).toContain("const mailto = \`mailto:\${contactMailbox}?subject=");
    expect(source).toContain('<a');
    expect(source).toContain('href={mailto}');
    expect(source).not.toContain('<Link\n                  href={mailto}');
  });

  it('keeps both Portuguese and English CTA labels', async () => {
    const source = await readFile(CONTACT, 'utf8');

    expect(source).toContain("emailLabel: 'Enviar pedido por email'");
    expect(source).toContain("emailLabel: 'Send request by email'");
  });

  it('does not introduce automatic email submission', async () => {
    const source = await readFile(CONTACT, 'utf8');

    expect(source).not.toContain("fetch('/api/contact");
    expect(source).not.toContain('resend.emails.send');
    expect(source).not.toContain('sendMail(');
  });
});
