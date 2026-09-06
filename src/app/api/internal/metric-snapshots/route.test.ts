import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { areDashboardMetricSnapshotsEnabled } from './route';

const routeSource = readFileSync('src/app/api/internal/metric-snapshots/route.ts', 'utf8');

describe('metric snapshots feature gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is disabled unless the feature flag is explicitly true', () => {
    vi.stubEnv('ENABLE_DASHBOARD_METRIC_SNAPSHOTS', '');
    expect(areDashboardMetricSnapshotsEnabled()).toBe(false);

    vi.stubEnv('ENABLE_DASHBOARD_METRIC_SNAPSHOTS', 'false');
    expect(areDashboardMetricSnapshotsEnabled()).toBe(false);

    vi.stubEnv('ENABLE_DASHBOARD_METRIC_SNAPSHOTS', ' TRUE ');
    expect(areDashboardMetricSnapshotsEnabled()).toBe(true);
  });

  it('returns the disabled no-op before creating a Supabase admin client', () => {
    const featureGate = routeSource.indexOf('if (!areDashboardMetricSnapshotsEnabled())');
    const adminClientCreation = routeSource.indexOf('const supabase = createAdminClient();');

    expect(featureGate).toBeGreaterThan(-1);
    expect(adminClientCreation).toBeGreaterThan(-1);
    expect(featureGate).toBeLessThan(adminClientCreation);
    expect(routeSource.slice(featureGate, adminClientCreation)).toContain("status: 'disabled'");
    expect(routeSource.slice(featureGate, adminClientCreation)).toContain("reason: 'dashboard_metric_snapshots_disabled'");
  });
});
