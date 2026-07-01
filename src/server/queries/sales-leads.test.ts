import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import {
  emptySalesLeadMetrics,
  getSalesLeadDetail,
  isSalesLeadId,
  listSalesLeads,
  normalizeSalesLeadFilters,
  SALES_LEAD_STATUSES,
} from './sales-leads';

const leadId = '11111111-1111-4111-8111-111111111111';

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

  it('validates lead detail ids before querying Supabase', async () => {
    mocks.createAdminClient.mockClear();
    expect(isSalesLeadId(leadId)).toBe(true);
    expect(isSalesLeadId('not-a-uuid')).toBe(false);
    await expect(getSalesLeadDetail('not-a-uuid')).resolves.toBeNull();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});

describe('sales lead queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists leads with bounded filters and pagination', async () => {
    const calls: Array<[string, unknown]> = [];
    const query = {
      select: vi.fn(() => query),
      is: vi.fn((column: string, value: unknown) => {
        calls.push([`is:${column}`, value]);
        return query;
      }),
      order: vi.fn(() => query),
      range: vi.fn((from: number, to: number) => {
        calls.push(['range', [from, to]]);
        return query;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        calls.push([`eq:${column}`, value]);
        return query;
      }),
      or: vi.fn((value: string) => {
        calls.push(['or', value]);
        return query;
      }),
      then: vi.fn((resolve: (value: unknown) => unknown) => resolve({ data: [{ id: leadId, company_name: 'Acme' }], error: null, count: 1 })),
    };

    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    const result = await listSalesLeads({
      status: 'qualified',
      priority: 'urgent',
      source: 'book-demo',
      search: 'Acme_%',
      page: 2,
      pageSize: 25,
    });

    expect(result.count).toBe(1);
    expect(calls).toContainEqual(['range', [25, 49]]);
    expect(calls).toContainEqual(['eq:status', 'qualified']);
    expect(calls).toContainEqual(['eq:priority', 'urgent']);
    expect(calls).toContainEqual(['eq:source', 'book-demo']);
    expect(calls.find(([key]) => key === 'or')?.[1]).toBe('company_name.ilike.%Acme%,work_email.ilike.%Acme%');
  });

  it('loads a lead detail without selecting raw network hints', async () => {
    const query = {
      select: vi.fn((_columns: string) => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: { id: leadId, company_name: 'Acme' }, error: null })),
    };

    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    const detail = await getSalesLeadDetail(leadId);
    const selectedColumns = query.select.mock.calls.at(0)?.[0] ?? '';

    expect(detail?.id).toBe(leadId);
    expect(selectedColumns).not.toContain('ip_hint');
    expect(selectedColumns).not.toContain('user_agent');
  });
});
