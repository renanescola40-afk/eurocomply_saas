import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 message brand copy guard', () => {
  it('keeps active message surfaces on canonical RISCK COMPLY casing', () => {
    const route = readFileSync('src/app/api/internal/email/test/route.ts', 'utf8');
    const templates = readFileSync('src/lib/email/templates.ts', 'utf8');

    expect(route).toContain('RISCK COMPLY Admin');
    expect(route).toContain('RISCK COMPLY Demo Org');
    expect(templates).toContain("const PRODUCT_NAME = 'RISCK COMPLY'");
    expect(templates).not.toContain("const PRODUCT_NAME = 'Risck Comply'");
  });
});
