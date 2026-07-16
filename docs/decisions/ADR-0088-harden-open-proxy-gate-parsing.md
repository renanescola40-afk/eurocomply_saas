# ADR-0088: Harden open-proxy and SSRF gate parsing

- Status: Proposed
- Date: 2026-07-16
- Priority: P1 security / release-control integrity

## Context

`scripts/security/check-no-open-proxy.mjs` is a repository gate intended to identify proxy-like and catch-all API routes that perform outbound fetches without the expected origin, authentication, rate-limit, and no-store controls. It also rejects routes that forward caller-controlled headers while injecting server-side credentials.

The gate previously inspected raw source text and recognized outbound fetches only when the exact substring `fetch(` was present. This created two concrete weaknesses:

1. Security-control names inside line or block comments could satisfy lexical checks even though the controls did not execute.
2. Equivalent direct calls such as `fetch (` or `globalThis.fetch(` were not recognized as outbound fetches.

This is a release-control integrity gap. It is not evidence that an exploitable SSRF route exists in production, and this decision does not claim a pentest or runtime validation.

## Decision

The gate will:

- remove line and block comments before evaluating route behavior and security-control tokens;
- preserve quoted strings and template literals while stripping comments;
- recognize direct `fetch` calls with optional whitespace and the `globalThis.fetch` spelling;
- retain the existing route classification, credential/header-forwarding rule, expected controls, and fail-closed exit behavior.

## Impact

The change affects only repository-side static validation. It does not alter application runtime behavior, network policy, authentication, authorization, rate limits, data, migrations, dependencies, or secrets.

The stricter parser can newly flag routes that previously passed because controls appeared only in comments or because fetch syntax used whitespace or `globalThis`. Such failures are intended and require review of the actual route.

## Limitations

This remains a lexical guard rather than an AST or data-flow analysis. It does not detect aliased fetch functions, third-party HTTP clients, dynamically constructed calls, or all possible SSRF data flows. It complements, but does not replace, code review, runtime egress controls, and security testing.

## Validation

A Vitest contract verifies that:

- comments are stripped before token evaluation;
- quoted and template-literal content is preserved;
- the gate no longer relies on the exact `fetch(` substring;
- common direct fetch spellings are recognized.

GitHub Actions on the exact pull-request head SHA remain the authoritative validation. The work must not be marked complete or merged unless all required checks are green.

## Rollback

Revert the commits introduced by the pull request. The previous lexical behavior will resume. No migration, provider action, secret rotation, or data repair is required.
