export type DocumentCommercialQuotaErrorCode =
  | 'document_quota_exceeded'
  | 'document_storage_quota_exceeded';

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

function errorText(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const candidate = error as ErrorLike;
  return [candidate.message, candidate.details]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

export function getDocumentCommercialQuotaErrorCode(
  error: unknown,
): DocumentCommercialQuotaErrorCode | null {
  const text = errorText(error);
  if (text.includes('document_storage_quota_exceeded')) return 'document_storage_quota_exceeded';
  if (text.includes('document_quota_exceeded')) return 'document_quota_exceeded';
  return null;
}

export function documentCommercialQuotaMessage(code: DocumentCommercialQuotaErrorCode) {
  return code === 'document_storage_quota_exceeded'
    ? 'Document storage limit reached for this plan.'
    : 'Document limit reached for this plan.';
}
