import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PAGE = new URL('../../src/app/[locale]/ai-systems/page.tsx', import.meta.url);
const REGISTRY = new URL('../../src/app/[locale]/ai-systems/ai-systems-registry-v2.tsx', import.meta.url);

describe('AI Systems enterprise registry V2', () => {
  it('keeps the table-first registry ahead of the governed assessment workspace', async () => {
    const page = await readFile(PAGE, 'utf8');

    expect(page).toContain("import { AiSystemsRegistryV2 } from './ai-systems-registry-v2'");
    expect(page).toContain('<AiSystemsRegistryV2 locale={locale} systems={systems} organizationName={organization?.name} />');
    expect(page.indexOf('<AiSystemsRegistryV2')).toBeLessThan(page.indexOf('<AiSystemsClient'));
    expect(page).toContain("roleHasPermission(organization.role, 'manage_ai_governance')");
  });

  it('renders live workspace fields and operational filters without demo metrics', async () => {
    const registry = await readFile(REGISTRY, 'utf8');

    expect(registry).toContain('<table');
    expect(registry).toContain('system.risk_level');
    expect(registry).toContain('system.owner_team');
    expect(registry).toContain('system.country_market');
    expect(registry).toContain('system.vendor_name');
    expect(registry).toContain('system.model_name');
    expect(registry).toContain('system.lifecycle_status');
    expect(registry).toContain('system.updated_at');
    expect(registry).toContain('setRiskFilter');
    expect(registry).toContain('setStatusFilter');
    expect(registry).toContain('setQuery');
    expect(registry).toContain('systems.length');
    expect(registry).not.toContain("['24'");
    expect(registry).not.toContain("'87%'");
    expect(registry).not.toContain("'92%'");
  });
});
