export type SupabaseSchemaErrorLike = {
  code?: string | null;
};

const EXPECTED_MISSING_RELATION_CODES = new Set([
  '42P01',
  'PGRST205',
]);

const EXPECTED_MISSING_COLUMN_CODES = new Set([
  '42703',
  'PGRST204',
]);

function getSchemaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const code = 'code' in error ? (error as SupabaseSchemaErrorLike).code : null;
  return typeof code === 'string' ? code : null;
}

/**
 * Use only when the compatibility boundary is an explicitly absent relation.
 * Column-level drift must not be downgraded by this classifier.
 */
export function isExpectedMissingSupabaseRelation(error: unknown): boolean {
  const code = getSchemaErrorCode(error);
  return code !== null && EXPECTED_MISSING_RELATION_CODES.has(code);
}

/**
 * Use only for governed compatibility probes that intentionally span both a
 * not-yet-promoted relation and a not-yet-promoted selected column.
 */
export function isExpectedMissingSupabaseSchema(error: unknown): boolean {
  const code = getSchemaErrorCode(error);
  return code !== null
    && (EXPECTED_MISSING_RELATION_CODES.has(code) || EXPECTED_MISSING_COLUMN_CODES.has(code));
}
