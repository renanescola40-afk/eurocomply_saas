# ADR-0085: Ignore comments in the API endpoint hardening gate

- Status: Proposed
- Date: 2026-07-16
- Priority: P1 security / release-control integrity

## Context

`scripts/security/check-api-endpoint-hardening.mjs` classifies API routes by searching source text for authentication, validation, rate-limit, client-input and unsafe-CORS tokens.

Before this decision, the gate searched the raw source file. A comment containing a token such as `requireApiUser`, `checkDistributedRateLimit` or `.safeParse(` could therefore be counted as evidence that a control existed even though the commented text did not execute. This was a concrete false-positive path in a security release gate.

The gate is intentionally lightweight and does not claim semantic TypeScript analysis. The change must therefore reduce an identified bypass without pretending to prove runtime enforcement.

## Decision

Remove JavaScript and TypeScript line and block comments before applying the existing token checks.

The comment stripper:

- preserves line boundaries;
- preserves single-quoted, double-quoted and template-literal content;
- respects escaped characters inside quoted content;
- replaces comment characters with whitespace rather than concatenating adjacent code;
- is applied before method, guard, validation, rate-limit, client-input and CORS detection.

The existing allowlist, token taxonomy, changed-route behavior and full-scan fallback remain unchanged.

## Impact

Comment-only security tokens can no longer satisfy the API hardening gate. Existing executable routes that already contain the expected controls are unaffected.

No application runtime code, database schema, RLS policy, RBAC rule, secret, dependency or production evidence is changed.

## Risks and trade-offs

- This remains lexical analysis, not an AST or control-flow proof.
- An imported but unused security helper may still create a false positive.
- Template-literal interpolation is preserved as quoted content by this implementation; the gate does not attempt to parse code embedded inside templates.
- Regex literals containing comment-like sequences are not fully parsed. Current security tokens are expected in ordinary route code, so this is accepted as a bounded improvement rather than a complete parser.

A future migration to TypeScript AST analysis should supersede this ADR if the added complexity is justified.

## Tests

`tests/security/api-endpoint-hardening-comment-bypass.test.ts` asserts that the gate strips line and block comments before token evaluation and preserves quoted/template content handling.

GitHub Actions on the exact PR head SHA remain the authoritative repository validation. This ADR does not claim production execution, pentesting, external audit or runtime security evidence.

## Rollback

Revert the PR containing this ADR and the associated script/test changes. No migration, provider change, secret rotation, data repair or deployment coordination is required. Reverting restores the documented comment-based false-positive risk.
