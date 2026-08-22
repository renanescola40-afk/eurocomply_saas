export type SupabaseSchemaErrorLike = {
  code?: string | null;
};

const EXPECTED_MISSING_SCHEMA_CODES = new Set([
  '42P01',
  '42703',
  'PGRST204',
  'PGRST205',
]);

/**
 * Classifies only the database/PostgREST codes already used by the product to
 * represent a relation or selected column that is not available in the
 * currently promoted schema. Callers must still know that the queried object
 * is an explicitly governed compatibility dependency before treating this as
 * a deferred state.
 *
 * This intentionally returns a plain boolean rather than a type predicate:
 * PostgREST errors already expose `code`, so narrowing them to this structural
 * shape would incorrectly make the non-matching branch `never` in callers.
 */
export function isExpectedMissingSupabaseSchema(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? (error as SupabaseSchemaErrorLike).code : null;
  return typeof code === 'string' && EXPECTED_MISSING_SCHEMA_CODES.has(code);
}
