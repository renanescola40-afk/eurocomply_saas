import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { locales } from '../../src/lib/i18n/routing';
import { TRUST_CENTER_ROUTES } from '../../src/lib/trust-center/routes';

describe('public center routes', () => {
  it('keeps the page registry complete', () => {
    expect(TRUST_CENTER_ROUTES).toHaveLength(10);
    expect(TRUST_CENTER_ROUTES[0]).toBe('trust');
    expect(TRUST_CENTER_ROUTES[9]).toContain('disclosure');
  });

  it('keeps every page localized', () => {
    const urls = locales.flatMap((locale) => TRUST_CENTER_ROUTES.map((route) => `/${locale}/${route}`));

    expect(urls).toContain('/en/trust');
    expect(urls).toHaveLength(locales.length * TRUST_CENTER_ROUTES.length);
  });

  it('keeps the route file wired to the shared component', () => {
    const routeFile = readFileSync('src/app/[locale]/[trustPage]/page.tsx', 'utf8');

    expect(routeFile).toContain('generateStaticParams');
    expect(routeFile).toContain('TrustCenterPage');
  });
});
