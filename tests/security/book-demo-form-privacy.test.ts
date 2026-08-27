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
});
