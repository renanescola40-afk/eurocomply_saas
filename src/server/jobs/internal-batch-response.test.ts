import { describe, expect, it } from 'vitest';

import { internalBatchResponse } from './internal-batch-response';

describe('internalBatchResponse', () => {
  it('returns a no-store success response only when the failure count is zero', async () => {
    const response = internalBatchResponse({
      failureCount: 0,
      failureMessage: 'batch_failed',
      summary: { processed: 3, failed: 0 },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    await expect(response.json()).resolves.toEqual({ processed: 3, failed: 0, ok: true });
  });

  it('returns a fail-closed response when any batch item failed', async () => {
    const response = internalBatchResponse({
      failureCount: 2,
      failureMessage: 'batch_failed',
      summary: { processed: 3, failed: 2 },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      processed: 3,
      failed: 2,
      ok: false,
      error: 'batch_failed',
    });
  });

  it('supports an explicit multi-status for an orchestration envelope', () => {
    const response = internalBatchResponse({
      failureCount: 1,
      failureMessage: 'maintenance_partial_failure',
      failureStatus: 207,
      summary: { jobs: 4, failed: 1 },
    });

    expect(response.status).toBe(207);
  });

  it('rejects ambiguous or invalid summaries fail closed', () => {
    expect(() => internalBatchResponse({
      failureCount: -1,
      failureMessage: 'batch_failed',
      summary: {},
    })).toThrow('failureCount');

    expect(() => internalBatchResponse({
      failureCount: 0,
      failureMessage: 'batch_failed',
      summary: { ok: true },
    })).toThrow('reserved');
  });
});
