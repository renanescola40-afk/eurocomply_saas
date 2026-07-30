# ADR — Exact-SHA runtime evidence for versioned EU AI Act legal rules

- **Date:** 2026-07-30
- **Status:** Accepted for implementation; runtime promotion pending
- **Decision owners:** Principal Engineering, Security, SRE, EU AI Act Product Architecture
- **Scope:** `legal-rules.ts`, canonical decision engine, coverage registry, protected runtime validation and evidence promotion

## Context

The product already had a versioned EU AI Act registry and a canonical decision engine, but the `LEGAL-RULES` workstream had no runtime evidence. The registry also described the 2026 Article 5 amendment as adopted but pending official publication.

Regulation (EU) 2026/1744 was published in the Official Journal on 24 July 2026 and entered into force on 27 July 2026. The amended Article 5(1), first subparagraph, points (ba) and (bb), and Article 5(1a) and (1b) apply from 2 December 2026. The same act establishes the revised high-risk application dates and the provider-only Article 111(4) transition for Article 50(2).

A repository test alone cannot prove that a deployment is running the intended legal-rules version. A runtime artifact must be bound to the exact deployed SHA, URL, environment, test outcomes and integrity digest.

## Decision

1. Use the Official Journal ELI for Regulation (EU) 2026/1744 as the authoritative source for amended rules.
2. Represent entry into force and individual provision application dates separately.
3. Version all legal rules with `AI_ACT_LEGAL_RULES_VERSION` and include `sourceRegulation` per rule.
4. Fail closed when a rule derived from Regulation (EU) 2026/1744 does not point to the official act or carries the wrong publication date.
5. Expose a protected, read-only runtime validation endpoint at `/api/ops/legal-rules-validation`.
6. Apply fail-closed internal-authentication rate limiting before validating `INTERNAL_CRON_SECRET` or `CRON_SECRET`.
7. Bind runtime evidence to a full 40-character deployment SHA using the repository's canonical runtime release metadata.
8. Return HTTP 503 when runtime provenance or any legal-rule test case fails.
9. Apply `no-store`, anti-framing, no-referrer, no-index and `nosniff` headers.
10. Sanitize request identifiers and never retain authorization, cookies, secrets, customer data or evidence payloads.
11. Compute a deterministic legal-rules digest and artifact SHA-256.
12. Make the coverage scorer accept this specialized artifact only when repository, SHA, URL, environment, all test cases and integrity hash pass.
13. Commit a `NOT_EXECUTED` placeholder at the canonical path, deliberately rejected by the scorer until a real deployment is tested.

## Security and privacy consequences

- The endpoint exposes rule metadata outcomes and release provenance only after internal token authentication; it contains no customer or tenant data.
- Authentication attempts are distributed-rate-limited before token verification.
- The capture workflow obtains the credential from GitHub secrets and never persists the Authorization header.
- Exact-SHA binding prevents stale or cross-deployment evidence promotion.
- Integrity verification prevents edited evidence files from receiving runtime credit.
- The endpoint is not a compliance certificate and cannot replace qualified legal review.

## Operational consequences

- CI validates implementation, contracts, lint, typecheck, build and focused security gates.
- Runtime capture is a separate deployment-bound action requiring the same secret on the deployment and in the protected GitHub workflow.
- The workstream remains incomplete while the artifact is `NOT_EXECUTED`, the deployment SHA is unknown, CI is not green or qualified review is absent.
- Production smoke and the final frozen-main closeout remain independent release gates.

## Alternatives considered

### Count repository tests as runtime proof

Rejected. This would not demonstrate what is deployed and would violate exact-SHA evidence requirements.

### Commit a synthetic PASS artifact

Rejected. Synthetic evidence may prove isolated behavior but cannot establish deployment URL, runtime release metadata or production/preview execution.

### Keep the endpoint public

Rejected after endpoint-taxonomy review. Although the payload contains no tenant data, a protected ops route gives a clearer trust boundary, prevents unauthenticated release-provenance enumeration and aligns with the repository's internal operational endpoint controls.

### Infer the legal amendment date from the regulation's entry into force

Rejected. The act entered into force on 27 July 2026, while the new Article 5 prohibitions apply from 2 December 2026.

## Rollback

Rollback is code-only and does not require a database migration:

1. Revert the protected runtime endpoint, runtime evidence builder, capture workflow and scorer specialization.
2. Revert the legal-rules registry to the previous version only if a qualified review establishes that the new official-source mapping is incorrect.
3. Keep all previously captured artifacts immutable and mark them superseded rather than editing them.
4. Redeploy the last known-good SHA.
5. Confirm `/api/health`, protected readiness, the canonical decision-engine suite and the previous legal-rules tests.
6. Rotate the internal cron secret if an operational incident involved credential exposure.
7. Do not promote the prior `pending_official_publication` state merely to make CI green; legal-source accuracy controls the rollback decision.

## Evidence boundary

This decision proves engineering controls for source freshness, deterministic rule selection and exact-SHA runtime capture. It does not prove customer-specific applicability, legal sufficiency, certification, regulator acceptance or complete production readiness.
