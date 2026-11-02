# Audit metadata credential-key normalization (2026-11-02)

## Root cause
The audit sanitizer compared lowercased metadata field names without normalizing
separators or Unicode width. Sensitive values under fields such as
`x-api-key`, `API.KEY` and fullwidth `authorization` could survive filtering
and be persisted in tamper-evident audit metadata.

## Decision
Apply Unicode NFKC, lowercase and remove non-alphanumeric separators before
testing the existing blocked credential substrings (normalized the same way).
Preserve recursive sanitization, benign metadata and audit-chain hashing.

## Risk and evidence
- No changes to Supabase, production data, CircleCI or GitHub Actions.
- No real keys or customer information in tests.
- Local source test command: `npx vitest run src/server/queries/audit-events.test.ts tests/security/audit-chain-burst-concurrency-hardening.test.ts`.
- Exact-SHA CI, qualified review and bounded QA evidence are still required.
- Legitimate fields resembling sensitive credential names may now be omitted;
  review any such case before considering a narrow explicit exception.
- Roll back with a governed PR revert; no database restoration is needed.

## Gate mapping
A-04 / SEC-05; supporting evidence for A-03 / SEC-06.
Source changes do not imply either gate's acceptance.

## Transactional append fail-closed fallback classification
A second audit-integrity finding was identified during live read-only RPC verification:
the fallback predicate also treated **any** message containing `function` or the
RPC name as a missing RPC, even when a typed permission-denied error was returned.
When a compatibility fallback flag is explicitly enabled, that could downgrade
an authorization or operational failure into a nontransactional or legacy write.

The missing-RPC predicate now accepts only PostgreSQL undefined-function code
`42883` and PostgREST missing-schema-cache-function code `PGRST202`. It does
not reinterpret `42501` permission-denied or `P0001` application exceptions.
Negative tests assert no direct/legacy insert despite both fallback flags;
a positive `PGRST202` regression confirms the existing explicit compatibility
path remains available. No fallback flag is enabled by this PR.

Reviewers must independently consider whether these code predicates are correct
for the deployed PostgREST release. This strengthens fail-closed safety but is
not itself proof of the historical runtime failure's root cause.
