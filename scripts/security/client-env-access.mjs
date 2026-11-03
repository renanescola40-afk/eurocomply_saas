/**
 * Find client-side process.env references that are not direct NEXT_PUBLIC_* accesses.
 * Next.js only substitutes direct, statically named public variables. Indirection,
 * destructuring and bracket access are deliberately rejected (fail closed).
 * Source checks are defense-in-depth, not evidence of deployed bundle safety.
 */
const PROCESS_ENV_REFERENCE = /\bprocess\s*(?:(?:\?\.|\.)\s*env|(?:\?\.\s*)?\[\s*['"]env['"]\s*\])/g;
const DIRECT_PUBLIC_ACCESS = /^\s*\.\s*NEXT_PUBLIC_[A-Z0-9_]+\b/;

export function findUnsafeClientEnvReferences(source) {
  const findings = [];
  for (const match of source.matchAll(PROCESS_ENV_REFERENCE)) {
    const start = match.index ?? 0;
    const suffix = source.slice(start + match[0].length);
    if (!DIRECT_PUBLIC_ACCESS.test(suffix)) findings.push(start);
  }
  return findings;
}
