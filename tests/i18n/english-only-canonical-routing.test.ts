import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('English-only canonical customer surface', () => {
  it('forces historical non-English routes to canonical English', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain("localeSegment !== 'en'");
    expect(middleware).toContain('NextResponse.redirect(redirectUrl, 308)');
    expect(middleware).toContain("response.cookies.set(LOCALE_COOKIE, 'en'");
  });

  it('does not let a historical locale cookie select a non-English route', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain('function detectLocale(_req: NextRequest): string');
    expect(middleware).toContain('return defaultLocale;');
  });

  it('exposes English only from both language switchers', () => {
    expect(read('src/components/LanguageSwitcher.tsx')).toContain("(['en'] as const).map");
    expect(read('src/components/i18n/language-switcher.tsx')).toContain("(['en'] as const).map");
  });

  it('forces transactional recipient locale resolution to English', () => {
    const recipientLocale = read('src/lib/i18n/recipient-locale.ts');
    expect(recipientLocale).toContain('return RECIPIENT_LOCALE_FALLBACK;');
    expect(recipientLocale).not.toContain('locales.includes');
  });

  it('uses the canonical English recovery entrypoint', () => {
    expect(read('src/app/[locale]/login/page.tsx')).toContain('recover-password');
    expect(read('src/app/[locale]/recover-password/page.tsx')).toContain("export { default } from '../recuperar-senha/page';");
  });
  it('makes English the sole normalized runtime locale', () => {
    const locales = read('src/lib/i18n/locales.ts');
    expect(locales).toContain("return 'en';");
  });

  it('keeps runtime translation and onboarding errors English-only', () => {
    const translator = read('src/components/i18n/global-runtime-translator.tsx');
    const onboarding = read('src/lib/onboarding/action-failure.ts');
    expect(translator).toContain('const target = row.en;');
    expect(onboarding).toContain('const isPt = false;');
  });


  it('keeps direct customer-facing residual surfaces English-only', () => {
    const approvals = read('src/app/[locale]/aprovacoes/approvals-client.tsx');
    const legacyOrganizations = read('src/app/[locale]/dashboard/organizations/clerk/page.tsx');

    expect(approvals).toContain("submittedAt: 'Today'");
    expect(approvals).toContain("submittedAt: 'Yesterday'");
    expect(approvals).toContain("submittedAt: 'This week'");
    expect(approvals).not.toContain("submittedAt: 'Hoje'");
    expect(approvals).not.toContain("submittedAt: 'Ontem'");
    expect(approvals).not.toContain("submittedAt: 'Esta semana'");

    expect(legacyOrganizations).toContain('Legacy flow retired');
    expect(legacyOrganizations).toContain('Centralized organization management');
    expect(legacyOrganizations).toContain('Open organizations');
    expect(legacyOrganizations).not.toContain('Fluxo legado retirado');
    expect(legacyOrganizations).not.toContain('Gestão centralizada de organizações');
  });

  it('uses English as the sole application dictionary', () => {
    const appDictionary = read('src/lib/i18n/app-dictionary.ts');
    expect(appDictionary).toContain('return dictionaries.en;');
  });

});
