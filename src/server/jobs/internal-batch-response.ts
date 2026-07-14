import { noStoreJson } from '@/server/security/no-store';

type InternalBatchSummary = Record<string, unknown>;

type InternalBatchResponseOptions<TSummary extends InternalBatchSummary> = {
  summary: TSummary;
  failureCount: number;
  failureMessage: string;
  successStatus?: number;
  failureStatus?: number;
};

function assertHttpStatus(value: number, label: string) {
  if (!Number.isInteger(value) || value < 200 || value > 599) {
    throw new Error(`${label} must be an integer HTTP status between 200 and 599`);
  }
}

export function internalBatchResponse<TSummary extends InternalBatchSummary>({
  summary,
  failureCount,
  failureMessage,
  successStatus = 200,
  failureStatus = 500,
}: InternalBatchResponseOptions<TSummary>) {
  if (!Number.isSafeInteger(failureCount) || failureCount < 0) {
    throw new Error('failureCount must be a non-negative safe integer');
  }

  if (!failureMessage.trim()) {
    throw new Error('failureMessage is required');
  }

  if ('ok' in summary || 'error' in summary) {
    throw new Error('batch summary must not define reserved ok or error fields');
  }

  assertHttpStatus(successStatus, 'successStatus');
  assertHttpStatus(failureStatus, 'failureStatus');

  if (failureCount > 0) {
    return noStoreJson(
      { ...summary, ok: false, error: failureMessage },
      { status: failureStatus },
    );
  }

  return noStoreJson({ ...summary, ok: true }, { status: successStatus });
}
