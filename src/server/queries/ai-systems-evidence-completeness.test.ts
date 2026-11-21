import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  rows: [] as Array<{ id: string; organization_id: string }>,
  count: 0 as number | null,
  selectOptions: [] as unknown[],
  filters: [] as Array<[string, string]>,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (_columns: string, options: unknown) => {
        fixture.selectOptions.push(options);
        let organizationId = '';
        const query = {
          eq: (column: string, value: string) => {
            fixture.filters.push([column, value]);
            if (column === 'organization_id') organizationId = value;
            return query;
          },
          order: () => query,
          then: (resolve: (value: unknown) => unknown) => {
            const rows = fixture.rows.filter((row) => row.organization_id === organizationId);
            return Promise.resolve(resolve({ data: rows.slice(0, 1000), count: fixture.count, error: null }));
          },
        };
        return query;
      },
    }),
  }),
}));

import { listAiSystems } from './ai-systems';

describe('complete AI inventory for evidence', () => {
  beforeEach(() => {
    fixture.rows = Array.from({ length: 1001 }, (_, index) => ({ id: String(index + 1), organization_id: 'tenant-a' }));
    fixture.count = 1001;
    fixture.selectOptions = [];
    fixture.filters = [];
  });

  it('refuses an apparently successful but capped response of 1000 out of 1001 systems', async () => {
    await expect(listAiSystems('tenant-a', { requireComplete: true })).rejects.toThrow('Unable to load AI systems.');
    expect(fixture.selectOptions).toEqual([{ count: 'exact' }]);
    expect(fixture.filters).toEqual([['organization_id', 'tenant-a']]);
  });

  it('refuses evidence if the backend omits the exact count', async () => {
    fixture.count = null;
    await expect(listAiSystems('tenant-a', { requireComplete: true })).rejects.toThrow('Unable to load AI systems.');
  });

  it('accepts one complete tenant-scoped response and excludes a foreign tenant', async () => {
    fixture.rows = fixture.rows.slice(0, 999);
    fixture.rows.push({ id: 'foreign', organization_id: 'tenant-b' });
    fixture.count = 999;
    const systems = await listAiSystems('tenant-a', { requireComplete: true });
    expect(systems).toHaveLength(999);
    expect(systems.some((system) => system.organization_id !== 'tenant-a')).toBe(false);
  });

  it('accepts exactly 1000 rows when the exact count is 1000', async () => {
    fixture.rows = fixture.rows.slice(0, 1000);
    fixture.count = 1000;
    const systems = await listAiSystems('tenant-a', { requireComplete: true });
    expect(systems).toHaveLength(1000);
    expect(fixture.selectOptions).toEqual([{ count: 'exact' }]);
  });

  it('requires complete inventory in both evidence pack paths', () => {
    const auditPack = readFileSync('src/server/queries/audit-evidence-pack.ts', 'utf8');
    const enterprisePack = readFileSync('src/app/api/ai-systems/route.ts', 'utf8');
    expect(auditPack).toContain("listAiSystems(organization.id, { requireComplete: true })");
    expect(enterprisePack).toContain("listAiSystems(input.organizationId, { requireComplete: true })");
  });
});
