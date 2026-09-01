import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('auth entry brand V2', () => {
  it('uses the official wordmark on login while preserving redirect hardening and auth entry points', () => {
    const source = read('src/app/[locale]/login/page.tsx');

    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('function safeNext(');
    expect(source).toContain("value.startsWith('//')");
    expect(source).toContain("value.includes('://')");
    expect(source).toContain('signInWithEmail');
    expect(source).toContain('signInWithGoogle');
    expect(source).toContain('<EnterpriseSsoLogin');
    expect(source).toContain('router.replace(afterSignInUrl)');
  });

  it('uses the official wordmark on signup while preserving plan and continuation authority', () => {
    const source = read('src/app/[locale]/signup/page.tsx');

    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('function getSafeSignupContinuation(');
    expect(source).toContain("normalizedNext.startsWith('//')");
    expect(source).toContain("normalizedNext.includes('://')");
    expect(source).toContain("[`/${locale}/onboarding`, `/${locale}/checkout`]");
    expect(source).toContain('signInWithGoogle');
    expect(source).toContain('signUpWithEmail');
    expect(source).toContain('requested_plan: selectedPlan.id');
    expect(source).toContain('getSalesLedHref(activeLocale, selectedPlan.id)');
    expect(source).toContain('BILLING_PLANS.map');
    expect(source).toContain('bg-[#07101a]');
  });
});