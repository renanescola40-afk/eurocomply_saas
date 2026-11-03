/**
 * Find client-side process.env references that are not direct NEXT_PUBLIC_* accesses.
 * Next.js only substitutes direct, statically named public variables. Indirection,
 * destructuring and bracket access are deliberately rejected (fail closed).
 * Source checks are defense-in-depth, not evidence of deployed bundle safety.
 */
const PROCESS_ENV_REFERENCE = /\bprocess\s*(?:(?:\?\.|\.)\s*env|(?:\?\.\s*)?\[\s*['"]env['"]\s*\])/g;
const DIRECT_PUBLIC_ACCESS = /^\s*\.\s*(NEXT_PUBLIC_[A-Z0-9_]+)\b/;
// Keep this finite list aligned with the approved public variable names in
// scripts/security/check-public-secrets.mjs; an arbitrary NEXT_PUBLIC_ prefix
// is not sufficient proof that a name or value is safe for the browser.
const APPROVED_PUBLIC_ENV_NAMES = new Set([
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_KEY',
  'NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
]);

export function findUnsafeClientEnvReferences(source) {
  const findings = [];
  for (const match of source.matchAll(PROCESS_ENV_REFERENCE)) {
    const start = match.index ?? 0;
    const suffix = source.slice(start + match[0].length);
    const directPublicAccess = DIRECT_PUBLIC_ACCESS.exec(suffix);
    if (match[0] !== 'process.env' || !directPublicAccess || !APPROVED_PUBLIC_ENV_NAMES.has(directPublicAccess[1])) findings.push(start);
  }
  return findings;
}
