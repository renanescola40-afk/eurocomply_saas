# A-04 / SEC-05: independent security evidence admission contract (2026-11-04)

Status: Proposed

Status: source-only verifier implementation proposed for qualified review. **SEC-05 is NOT_VERIFIED; A-04 is NOT ACCEPTED.**

## Context

The frozen G1 scorer validates proof contents only for OPS-01 and BIL-01. A fully
sourced new SEC-05 PASS could not be admitted because the unknown-control
branch failed closed. This patch adds only a SEC-05-specific verifier; every
other unknown criterion still fails closed. Neither 38 mandatory controls
nor the 24-gate denominator, dependencies, acceptedBy/acceptedAt, or production
release-authority state changes.

## Required external attestation

Proof must use `risck-comply.g1.sec05-secrets-encryption.v1` and bind its
source and production deployment SHA to the approved source baseline, with the
verified Vercel project and domain, and fixed Supabase project identities.
Eight separately evidenced proof kinds are required, all with matching source
SHA, PASS, provider HTTPS URL, observed date and SHA-256 artifact fingerprint:
CircleCI source secret scan, client-boundary scan, emitted browser bundle scan;
Vercel runtime log redaction, TLS cert and environment scoping; Supabase
database encryption and storage encryption. A separate critical/high exposure
disposition and independent reviewer acknowledgement are also mandatory.

The verifier is *syntactic/admission-only*: a JSON assertion, fake URL, or
SHA-256-shaped string is **not actual verified provider evidence**. The
qualified reviewer and independent Evidence Factory must inspect provider
readbacks/artifacts for authenticity and full coverage before updating any
live registry to PASS. Do not copy synthetic test fixtures to evidence folders.

## Observed current blockers (partial provider metadata, 2026-11-04)

- Production domain `www.risckcomply.com` is Vercel-verified.
- Vercel returned only the first 100 environment entries and may truncate
  target arrays. This is **not** complete signing key/server-secret scope
  or bundle disclosure proof. No values were decrypted or used.
- Existing #2600 adds a fail-closed client-source environment guard. It
  is not sufficient to prove emitted build output, logs, deployed encryption
  or an accepted exact-SHA source scan.
- Both Supabase projects independently returned the security advisor warning
  `auth_leaked_password_protection`, tracked under SEC-01, not ignored.
- GitHub hosted checks were experiencing admission-level failures. Historical
  CircleCI outcomes apply only to their actual tested SHA.

## Validation, rollback, ownership

Command: `node --test tests/release/sec05-acceptance-verifier.test.mjs`.
Expected six tests with synthetic fixtures, including negative/adversarial
fail-closed cases. Full exact-SHA Node tests, source scans, typecheck, build,
CircleCI and qualified independent review are still required. Roll back this
small source change via the governed PR if it conflicts with the accepted
formal contract. Do not set any registry status to PASS to make a test green.

## Decision

Implement only a SEC-05-specific evidence admission verifier while preserving rejection of every other unknown criterion. Require exact-source and production SHA binding, separately attributable provider artifacts, and qualified independent verification. Synthetic fixtures prove parser and denial behavior only; they do not satisfy provider provenance or approve SEC-05.

## Rollback

If this source-only verifier introduces a verified regression, revert the isolated verifier change through an independently reviewed PR and rerun its adversarial tests. Preserve the frozen 24-gate and 38-control denominators, fail-closed unknown-control handling and the prohibition on recording unverified provider evidence as PASS.

## Risks and trade-offs

A syntactically valid assertion can contain fabricated or stale provider URLs, timestamps, or fingerprints. Requiring independent provider readback and deployment-bound evidence slows admission but prevents unsupported compliance claims. This verifier cannot replace the eight provider proof kinds or qualified review.

