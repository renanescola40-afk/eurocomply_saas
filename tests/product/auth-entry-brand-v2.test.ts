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
    expect(source).toContain('if (result.session)');
    expect(source).not.toContain('if (user) {');
    expect(source).toContain('getSalesLedHref(activeLocale, selectedPlan.id)');
    expect(source).toContain('BILLING_PLANS.map');
    expect(source).toContain('bg-[#080e18]');
    expect(source).toContain('rounded-xl');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('rounded-2xl');
    expect(source).not.toContain('shadow-2xl');
    expect(source).not.toContain('radial-gradient');
    expect(source).toContain("const locale = params?.locale ?? 'en';");
    expect(source).toContain("link: 'Privacy Policy'");
    expect(source).toContain('minLength={12}');
    expect(source).toContain('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}');
  });

  it('uses the signup result session as the immediate continuation authority', () => {
    const auth = read('src/hooks/useAuth.tsx');

    expect(auth).toContain('const { data, error } = await supabase.auth.signUp');
    expect(auth).toContain('session: data?.session ?? null');
  });
});

describe('authenticated product commercial gate', () => {
  it('fails closed before rendering paid product content for an unlicensed organization', () => {
    const source = read('src/components/dashboard/authenticated-product-shell.tsx');

    expect(source).toContain('getOrganizationBillingAuthority(organization.id)');
    expect(source).toContain('if (!authority.licensed)');
    expect(source).toContain('redirect(getPaymentRequiredPath(locale, organization.selected_plan))');
  });
});
