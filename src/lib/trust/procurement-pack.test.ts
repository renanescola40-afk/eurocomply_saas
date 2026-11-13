import { describe, expect, it } from 'vitest';

import { buildPublicProcurementPack, procurementControls, procurementDocuments, procurementProviders } from './procurement-pack';

describe('public procurement pack', () => {
  it('publishes a stable evidence-bound schema', () => {
    const pack = buildPublicProcurementPack('https://www.risckcomply.com');
    expect(pack.schemaVersion).toBe(1);
    expect(pack.product).toBe('RISCK COMPLY');
    expect(pack.controls).toHaveLength(procurementControls.length);
    expect(pack.providers).toHaveLength(procurementProviders.length);
    expect(pack.documents).toHaveLength(procurementDocuments.length);
  });

  it('uses absolute same-origin document URLs', () => {
    const pack = buildPublicProcurementPack('https://www.risckcomply.com');
    for (const document of pack.documents) {
      expect(document.url.startsWith('https://www.risckcomply.com/')).toBe(true);
    }
  });

  it('keeps unsupported certifications explicitly unclaimed', () => {
    const certifications = procurementControls.find((control) => control.id === 'certifications');
    expect(certifications?.status).toBe('not-claimed');
    expect(certifications?.summary).toContain('No SOC 2 or ISO 27001 certification is claimed');
    expect(certifications?.summary).toContain('dated and attributable certification evidence');

    const assessment = procurementControls.find((control) => control.id === 'security-assessment');
    expect(assessment?.status).toBe('evidence-required');
    expect(assessment?.summary).toContain('2026-09-12');
    expect(assessment?.summary).toContain('clean independent retest/terminal assurance remains open');
  });

  it('separates current source CI activity from unverified provider and data-transfer assurances', () => {
    const github = procurementProviders.find((provider) => provider.name === 'GitHub');
    const circleci = procurementProviders.find((provider) => provider.name === 'CircleCI');

    expect(github?.regionDisclosure).toContain('GitHub Actions executed real workflows on 11 November 2026');
    expect(github?.regionDisclosure).toContain('old budget limits are historical');
    expect(github?.regionDisclosure).not.toContain('currently budget-blocked');
    expect(github?.regionDisclosure).toMatch(/GitHub-hosted runners[^\n]{0,260}(DPA|transfer)/i);
    expect(github?.regionDisclosure).toContain('processing scope of those workflows remain OPEN');
    expect(circleci?.purpose).toContain('source-only');
    expect(circleci?.regionDisclosure).toContain('account-specific DPA');
    expect(circleci?.regionDisclosure).toContain('remain OPEN');
    expect(procurementProviders.some((provider) => provider.name === 'GitHub Actions')).toBe(false);
  });

  it('keeps a completed PostHog DPA notice distinct from unverified Production data flows', () => {
    const posthog = procurementProviders.find((provider) => provider.name === 'PostHog');

    expect(posthog?.regionDisclosure).toContain('Default project 209928');
    expect(posthog?.regionDisclosure).toContain('ingested_event=true');
    expect(posthog?.regionDisclosure).toContain('PandaDoc notice');
    expect(posthog?.regionDisclosure).toContain('1 September 2026');
    expect(posthog?.regionDisclosure).toContain('no exact canonical Production token binding has been verified');
    expect(posthog?.regionDisclosure).toContain('12-month event-retention fallback');
    expect(posthog?.regionDisclosure).toContain('GDPR role review remain open');
    expect(posthog?.regionDisclosure).not.toContain('connected assurance project was not the Production project');
    expect(posthog?.regionDisclosure).not.toContain('account-linked DPA evidence remain open');
  });

  it('has unique control and document identifiers', () => {
    expect(new Set(procurementControls.map((control) => control.id)).size).toBe(procurementControls.length);
    expect(new Set(procurementDocuments.map((document) => document.path)).size).toBe(procurementDocuments.length);
  });
});
