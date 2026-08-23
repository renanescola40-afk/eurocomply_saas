import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  tryCreateAdminClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient: supabaseMock.tryCreateAdminClient,
}));

import { dashboardMetricSnapshotsReadinessCheck } from './route';

describe('dashboard metric snapshot readiness', () => {
  beforeEach(() => {
    supabaseMock.limit.mockResolvedValue({ data: [], error: null });
    supabaseMock.select.mockReturnValue({ limit: supabaseMock.limit });
    supabaseMock.from.mockReturnValue({ select: supabaseMock.select });
    supabaseMock.tryCreateAdminClient.mockReturnValue({ from: supabaseMock.from });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    supabaseMock.tryCreateAdminClient.mockReset();
    supabaseMock.from.mockReset();
    supabaseMock.select.mockReset();
    supabaseMock.limit.mockReset();
  });

  it('does not require the snapshot schema while the feature is explicitly disabled', async () => {
    vi.stubEnv('ENABLE_DASHBOARD_METRIC_SNAPSHOTS', 'false');

    await expect(dashboardMetricSnapshotsReadinessCheck()).resolves.toEqual({
      enabled: false,
      configured: true,
      schemaReady: true,
    });
    expect(supabaseMock.tryCreateAdminClient).not.toHaveBeenCalled();
  });

  it('proves the exact snapshot read/write schema when the feature is enabled', async () => {
    vi.stubEnv('ENABLE_DASHBOARD_METRIC_SNAPSHOTS', 'true');

    await expect(dashboardMetricSnapshotsReadinessCheck()).resolves.toEqual({
      enabled: true,
      configured: true,
      schemaReady: true,
    });
    expect(supabaseMock.from).toHaveBeenCalledWith('compliance_metric_snapshots');
    expect(supabaseMock.select).toHaveBeenCalledWith(
      'organization_id,created_at,compliance_score,open_tasks,open_risks,critical_risks,high_risk_vendors,missing_documents,total_tasks,total_risks,total_vendors,total_documents',
    );
    expect(supabaseMock.limit).toHaveBeenCalledWith(1);
  });

  it('fails closed when the feature is enabled but the production schema is incomplete', async () => {
    vi.stubEnv('ENABLE_DASHBOARD_METRIC_SNAPSHOTS', 'true');
    supabaseMock.limit.mockResolvedValue({
      data: null,
      error: { code: '42703', message: 'column does not exist' },
    });

    await expect(dashboardMetricSnapshotsReadinessCheck()).resolves.toEqual({
      enabled: true,
      configured: false,
      schemaReady: false,
    });
  });

  it('fails closed when the feature is enabled but no admin client is available', async () => {
    vi.stubEnv('ENABLE_DASHBOARD_METRIC_SNAPSHOTS', 'true');
    supabaseMock.tryCreateAdminClient.mockReturnValue(null);

    await expect(dashboardMetricSnapshotsReadinessCheck()).resolves.toEqual({
      enabled: true,
      configured: false,
      schemaReady: false,
    });
  });
});
