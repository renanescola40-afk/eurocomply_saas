import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const metricRoute = readFileSync(
  new URL('../../src/app/api/internal/metric-snapshots/route.ts', import.meta.url),
  'utf8',
);
const maintenanceRoute = readFileSync(
  new URL('../../src/app/api/internal/daily-maintenance/route.ts', import.meta.url),
  'utf8',
);

describe('truthful internal batch results', () => {
  it('fails the metric snapshot request when any organization snapshot fails', () => {
    expect(metricRoute).toContain("import { internalBatchResponse } from '@/server/jobs/internal-batch-response';");
    expect(metricRoute).toContain('failureCount: results.failed');
    expect(metricRoute).toContain("failureMessage: 'Unable to create all metric snapshots'");
    expect(metricRoute).not.toContain('snapshotError.message');
    expect(metricRoute).toContain("message: 'internal_error'");
  });

  it('keeps the maintenance multi-status envelope while using measured failure duration', () => {
    expect(maintenanceRoute).toContain("import { internalBatchResponse } from '@/server/jobs/internal-batch-response';");
    expect(maintenanceRoute).toContain('failureCount: failed.length');
    expect(maintenanceRoute).toContain('failureStatus: 207');
    expect(maintenanceRoute).toContain('durationMs: Date.now() - startedAt');
    expect(maintenanceRoute).not.toContain('durationMs: 0');
  });
});
