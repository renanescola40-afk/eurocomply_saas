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

## Missing-column classifier
The companion direct-insert error predicate also treated *message text* mentioning
an audit column as proof of schema absence. Under both explicit compatibility
flags, a `42501` column-privilege denial could otherwise fall through to a
legacy insert. Accept only typed `42703` or `PGRST204` column errors.
Negative and positive tests verify that a permission-denied insert stops before
legacy fallback while a genuine missing-column error retains the explicit
compatibility path. Neither branch is enabled by default or configured here.

## SEC-06 structural readback, 2026-11-04 (not cryptographic assurance)

A reproducible read-only PostgreSQL query is stored at
`scripts/security/audit-chain-readonly-structural-proof.sql`. Executed as
the exact query source through the connected Supabase SQL API, once each in
QA (`zrxrrfbllsxtleyxjpsz`) and PROD (`tganhbbhfxcpblmgqprg`).
It selects **only aggregate counts** and explicitly rolls back.

| Observation | Isolated QA | PROD |
|---|---:|---:|
| Total audit events | 0 | 421 |
| Distinct organizations with events | 0 | 13 |
| Missing event hash | 0 | 4 |
| Missing HMAC signature | 0 | 393 |
| Unexpected hash algorithm | 0 | 0 |
| Organizations with invalid number of roots | 0 | 0 |
| Missing chain predecessor | 0 | 0 |
| Fork points | 0 | 0 |
| Repeated event hashes | 0 | 0 |
| Backward-time edges | 0 | 0 |
| Hashed events unreachable from an observed root | 0 | 0 |

All four hashless events occurred in June 2026; missing signatures include
330 October events. Dates derived from a separate monthly aggregate query,
without event payloads, tenants or user IDs. A configured HMAC signing secret
is *optional in the current `signAuditEventHash` helper*, and neither
signature validity nor actual signing-secret availability was established.

**Evidence boundary:** The SQL checks graph topology. It does not
recompute SHA-256 over canonical event payloads, validate HMAC signatures,
check a trusted external anchor, replay concurrent transactions, confirm
runtime RPC connectivity, or perform authenticated tenant isolation.
QA has no events, so a zero-anomaly QA result is an empty sample.
This is a provider SQL readback, NOT a gate PASS, customer data finding,
production security incident, or approval to alter production records.

**Gate status:** A-03 / SEC-06 = NOT_VERIFIED. Required next evidence:
isolated QA synthetic event replay with guaranteed rollback/cleanup,
exact-SHA CircleCI checks, a signed-JWT and rollback-safe end-to-end audit
operation, full canonical-hash verification on representative redacted proof
records, trusted anchor and signing-secret policy / rotation evidence, and
an owner-reviewed disposition of historical unsigned and hashless records.
No migration or production database write is justified by this count alone.

## Enterprise signed transactional audit fail-closed guard (2026-11-04)

**Root cause:** the normal writer accepts a hash-chained event without an HMAC
signature when `AUDIT_CHAIN_SIGNING_SECRET` is absent, because signing is
optional in the shared chain helper. Compatibility flags also allow direct or
legacy fallback after a typed missing-RPC error even in an Enterprise release.
Production read-only structural evidence showed 393/421 events without HMAC
signatures, including 330 in October 2026; this is NOT evidence of tampering.

**Scoped source fix:** when `RISCK_COMPLY_ENTERPRISE_RELEASE=true` or
`RELEASE_TARGET=enterprise`, reject audit persistence before accessing the
database if the signing secret is empty; reject any unexpectedly unsigned
chained payload before RPC; refuse both nontransactional and legacy fallback
even if compatibility flags are true. Do not print the signing key. Normal
non-enterprise behavior and the existing explicit compatibility flags are
otherwise unchanged. No SQL migration, customer-data update, provider secret
change or production deploy is included.

**Regressions:** 4 new Vitest cases cover absent secret under both Enterprise
selectors, explicit fallback flags with typed missing RPC, and an unsigned
chain despite configured signing material. Required exact-head
`npx vitest run src/server/queries/audit-events.test.ts`,
`npm run security:audit-chain`, `npm run typecheck`, `npm test`,
`npm run build`, plus CircleCI and reviewed Enterprise QA signed event
writes/rollback. **These tests remain NOT_EXECUTED against full repository**
until a checked-out exact-SHA runner is available; do not infer a PASS from
the source or from prior isolated tests.

**Deployment caveat:** activating Enterprise mode without configured signing
material will intentionally reject audit writes. Ensure secrets are present
and validate rollback and customer error behavior BEFORE any release.
Historical unsigned or hashless records require separate owner-approved
disposition; this source change does not sign historical events. SEC-06 and
A-03 remain NOT_VERIFIED.


## Enterprise audit-chain verifier: fail-closed HMAC / legacy completeness (2026-11-04)

The common verifier previously returned ok=true when the signing key was absent,
without performing any HMAC verification. The route also excluded hashless
historical events while reporting verification.ok. Under explicit Enterprise
release mode (RISCK_COMPLY_ENTERPRISE_RELEASE=true or RELEASE_TARGET=enterprise)
the route now requires an HMAC verification key, reports
signatureVerificationUnavailable, and reports ok=false for any unhashed legacy
records excluded from the loaded verification window. The shared verifier
remains backward compatible for callers not requesting requireSignatures=true.

Four regression cases have been authored for strict-mode no-key, signed and
unsigned records, Enterprise route flags, and legacy-event handling. No exact
SHA Vitest, full CI, CircleCI, signed JWT E2E, or cryptographic readback from
PROD has been executed; do not claim gate acceptance. The bounded route does
not validate an independent external trust anchor or full historical coverage.
Production historical unsigned/hashless events require governed disposition.
Roll back by governed PR revert; do not disable the guard merely to obtain PASS.
A-03/SEC-06 remains NOT_VERIFIED.
