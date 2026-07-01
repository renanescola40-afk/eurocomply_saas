import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { emptySalesLeadMetrics, normalizeSalesLeadFilters, SALES_LEAD_STATUSES } from './sales-leads';

describe('sales lead filters', () => {
  it('bounds pagination', () => {
    expect(normalizeSalesLeadFilters({ page: '-10', pageSize: '9999' })).toMatchObject({ page: 1, pageSize: 50 });
  });

  it('accepts only MVP pipeline statuses', () => {
    expect(normalizeSalesLeadFilters({ status: 'proposal_sent' }).status).toBe('proposal_sent');
    expect(normalizeSalesLeadFilters({ status: 'customer' }).status).toBeUndefined();
    expect(normalizeSalesLeadFilters({ status: 'not-a-status' }).status).toBeUndefined();
  });

  it('accepts only known priorities', () => {
    expect(normalizeSalesLeadFilters({ priority: 'urgent' }).priority).toBe('urgent');
    expect(normalizeSalesLeadFilters({ priority: 'invalid' }).priority).toBeUndefined();
  });

  it('limits text filters', () => {
    const filters = normalizeSalesLeadFilters({ source: 'x'.repeat(200), search: 'Acme Europe '.repeat(30) });
    expect(filters.source).toHaveLength(120);
    expect(filters.search?.length).toBeLessThanOrEqual(160);
  });

  it('keeps empty metrics stable when there are no leads', () => {
    const metrics = emptySalesLeadMetrics();
    for (const status of SALES_LEAD_STATUSES) {
      expect(metrics[status]).toBe(0);
    }
  });
});
