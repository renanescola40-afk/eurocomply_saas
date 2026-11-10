import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/marketing/book-demo-form.tsx', 'utf8');

describe('book demo form privacy boundary', () => {
  it('never falls back to a GET submission that can put lead PII in the URL', () => {
    expect(source).toContain('<form method="post" onSubmit={handleSubmit}');
    expect(source).not.toMatch(/<form[^>]*method=["']get["']/i);
  });

  it('keeps the enhanced submission on the protected JSON POST endpoint', () => {
    expect(source).toContain("fetch('/api/leads'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("'Content-Type': 'application/json'");
  });
  it('blocks the native HTML submission until hydration and provides a no-script alternative', () => {
    expect(source).toContain('useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated)');
    expect(source).toContain('const clientHydrated = () => true');
    expect(source).toContain('const serverHydrated = () => false');
    expect(source).toContain("disabled={!hydrated || state === 'submitting'}");
    expect(source).toContain('<noscript>');
    expect(source).toContain('JavaScript is required to submit this secure form.');
    expect(source).toContain('href="mailto:comercial@risckcomply.com"');
    expect(source).toContain("!hydrated ? 'Preparing secure form...'");
  });
});
