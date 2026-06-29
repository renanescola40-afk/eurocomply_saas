import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 message brand copy guard', () => {
  it('keeps active message surfaces on canonical Risck Comply casing', () => {
    const route = readFileSync('src/app/api/internal/email/test/route.ts', 'utf8');
    const templates = readFileSync('src/lib/email/templates.ts', 'utf8');

    expect(route).toContain('Risck Comply Admin');
    expect(route).toContain('Risck Comply Demo Org');
    expect(route).not.toContain('RISCK COMPLY');
    expect(templates).toContain("const PRODUCT_NAME = 'Risck Comply'");
    expect(templates).not.toContain('RISCK COMPLY');
  });
});
