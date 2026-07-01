import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { normalizeSalesLeadFilters } from './sales-leads';

describe('sales lead filters', () => {
  it('bounds pagination', () => {
    expect(normalizeSalesLeadFilters({ page: '-10', pageSize: '9999' })).toMatchObject({ page: 1, pageSize: 50 });
  });

  it('accepts only known statuses', () => {
    expect(normalizeSalesLeadFilters({ status: 'qualified' }).status).toBe('qualified');
    expect(normalizeSalesLeadFilters({ status: 'not-a-status' }).status).toBeUndefined();
  });

  it('limits text filters', () => {
    const filters = normalizeSalesLeadFilters({ source: 'x'.repeat(200), search: 'Acme Europe '.repeat(30) });
    expect(filters.source).toHaveLength(120);
    expect(filters.search?.length).toBeLessThanOrEqual(160);
  });
});
