import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const TRUST_PAGE = new URL('../../src/components/trust/trust-page.tsx', import.meta.url);

describe('Trust Center RISCK UI V2 brand contract', () => {
  it('uses the official RISCK COMPLY wordmark and cobalt interaction chrome', async () => {
    const source = await readFile(TRUST_PAGE, 'utf8');

    expect(source).toContain("import Image from 'next/image'");
    expect(source).toContain('src="/brand/risck-comply-wordmark.svg"');
    expect(source).toContain('alt="RISCK COMPLY"');
    expect(source).toContain('aria-label="RISCK COMPLY home"');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-[#0d1522]');
    expect(source).toContain('text-blue-200/65');
    expect(source).toContain('focus-visible:ring-blue-400');
    expect(source).not.toContain('ShieldCheck');
    expect(source).not.toContain('ring-cyan');
    expect(source).not.toContain('text-cyan');
    expect(source).not.toContain('bg-cyan');
    expect(source).not.toContain('hover:border-cyan');
  });

  it('keeps green and amber restricted to semantic trust and legal states', async () => {
    const source = await readFile(TRUST_PAGE, 'utf8');

    expect(source).toContain('border-emerald-300/15 bg-emerald-300/[0.055]');
    expect(source).toContain('text-emerald-100/70');
    expect(source).toContain('border-amber-300/15 bg-amber-300/[0.055]');
    expect(source).toContain('getLegalPublicationState()');
    expect(source).toContain('<ProviderRuntimeDisclosure locale={locale} slug={page.slug} />');
    expect(source).toContain('<PublicFooter locale={locale} />');
    expect(source).not.toContain('rgba(16,185,129,.14)');
  });
});
