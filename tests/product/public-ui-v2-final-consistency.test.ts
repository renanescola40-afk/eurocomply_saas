import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const CONTACT = new URL('../../src/app/[locale]/contact/page.tsx', import.meta.url);
const CONSENT_BANNER = new URL('../../src/components/analytics/AnalyticsConsentBanner.tsx', import.meta.url);
const CONSENT_CONTROLS = new URL('../../src/components/analytics/AnalyticsConsentControls.tsx', import.meta.url);

describe('RISCK COMPLY UI V2 final public consistency', () => {
  it('uses the official wordmark and cobalt system on the contact surface', async () => {
    const source = await readFile(CONTACT, 'utf8');

    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('bg-[#050913]');
    expect(source).toContain('bg-blue-600');
    expect(source).toContain('focus-visible:ring-blue-400');
    expect(source).not.toContain('ShieldCheck');
    expect(source).not.toContain('cyan-');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('rounded-[2rem]');
  });

  it('keeps analytics consent logic intact while removing legacy cyan chrome', async () => {
    const [banner, controls] = await Promise.all([
      readFile(CONSENT_BANNER, 'utf8'),
      readFile(CONSENT_CONTROLS, 'utf8'),
    ]);

    expect(banner).toContain('denyAnalyticsConsent');
    expect(banner).toContain('grantAnalyticsConsent');
    expect(banner).toContain('initPostHog');
    expect(banner).toContain('focus-visible:ring-blue-400');
    expect(banner).not.toContain('cyan-');

    expect(controls).toContain('denyAnalyticsConsent');
    expect(controls).toContain('grantAnalyticsConsent');
    expect(controls).toContain('initPostHog');
    expect(controls).toContain('bg-blue-600');
    expect(controls).not.toContain('cyan-');
  });
});
