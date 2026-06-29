import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 1 brand credibility guard', () => {
  it('keeps the README focused on the canonical Risck Comply product identity', () => {
    const readme = read('README.md');

    expect(readme).toContain('# Risck Comply');
    expect(readme).toContain('Active product name:** Risck Comply');
    expect(readme).toContain('Repository name:** `eurocomply_saas` is a legacy technical repository name');
    expect(readme).toContain('must **not** be described as enterprise-ready unless the relevant checks pass');
    expect(readme).not.toContain('RISCK COMPLY / EuroComply');
  });

  it('keeps active public metadata aligned to AI compliance instead of generic compliance copy', () => {
    const localeLayout = read('src/app/[locale]/layout.tsx');

    expect(localeLayout).toContain('Risck Comply - AI Compliance Operating System');
    expect(localeLayout).toContain('EU AI Act readiness, AI system inventory, risk evidence, governance documents and audit workflows');
    expect(localeLayout).not.toContain('fiscal identifiers');
    expect(localeLayout).not.toContain('Sistema Operacional de Compliance Europeu');
  });

  it('keeps public footer copy specific to AI Act readiness and evidence workflows', () => {
    const footer = read('src/components/marketing/public-footer.tsx');

    expect(footer).toContain('AI Act readiness, governance evidence and risk workflows');
    expect(footer).toContain('Risck Comply wordmark');
    expect(footer).not.toContain('Risck comply');
    expect(footer).not.toContain('fornecedores para equipas europeias');
  });

  it('keeps the route quality contract attached to the active product name', () => {
    const routeInventory = read('docs/quality/ROUTE_INVENTORY.md');

    expect(routeInventory).toContain('canonical route quality contract for Risck Comply');
    expect(routeInventory).not.toContain('canonical route quality contract for EuroComply');
  });

  it('documents legacy naming without reintroducing mixed customer-facing branding', () => {
    const brandCleanup = read('docs/brand-cleanup.md');

    expect(brandCleanup).toContain('The customer-facing product name is **Risck Comply**');
    expect(brandCleanup).toContain('Do not introduce legacy naming into new customer-facing copy');
    expect(brandCleanup).toContain('repository is still named `eurocomply_saas` for continuity');
  });
});
