# ADR — Exact-SHA runtime evidence for versioned EU AI Act legal rules

- **Date:** 2026-07-30
- **Status:** Accepted for implementation; runtime promotion pending
- **Decision owners:** Principal Engineering, Security, SRE, EU AI Act Product Architecture
- **Scope:** `legal-rules.ts`, canonical decision engine, coverage registry, public runtime validation and evidence promotion

## Context

The product already had a versioned EU AI Act registry and a canonical decision engine, but the `LEGAL-RULES` workstream had no runtime evidence. The registry also described the 2026 Article 5 amendment as adopted but pending official publication.

Regulation (EU) 2026/1744 was published in the Official Journal on 24 July 2026 and entered into force on 27 July 2026. The amended Article 5(1), first subparagraph, points (ba) and (bb), and Article 5(1a) and (1b) apply from 2 December 2026. The same act establishes the revised high-risk application dates and the provider-only Article 111(4) transition for Article 50(2).

A repository test alone cannot prove that a deployment is running the intended legal-rules version. A runtime artifact must be bound to the exact deployed SHA, URL, environment, test outcomes and integrity digest.

## Decision

1. Use the Official Journal ELI for Regulation (EU) 2026/1744 as the authoritative source for amended rules.
2. Represent entry into force and individual provision application dates separately.
3. Version all legal rules with `AI_ACT_LEGAL_RULES_VERSION` and include `sourceRegulation` per rule.
4. Fail closed when a rule derived from Regulation (EU) 2026/1744 does not point to the official act or carries the wrong publication date.
5. Expose a public, read-only, rate-limited runtime validation endpoint at `/api/public/legal-rules-validation`.
6. Bind runtime evidence to a full 40-character deployment SHA using the repository's canonical runtime release metadata.
7. Return HTTP 503 when runtime provenance or any legal-rule test case fails.
8. Apply `no-store`, anti-framing, no-referrer, no-index and `nosniff` headers.
9. Sanitize request identifiers and never retain authorization, cookies, secrets, customer data or evidence payloads.
10. Compute a deterministic legal-rules digest and artifact SHA-256.
11. Make the coverage scorer accept this specialized artifact only when repository, SHA, URL, environment, all test cases and integrity hash pass.
12. Commit a `NOT_EXECUTED` placeholder at the canonical path, deliberately rejected by the scorer until a real deployment is tested.

## Security and privacy consequences

- The endpoint exposes rule metadata outcomes and release provenance, not customer or tenant information.
- Distributed rate limiting mitigates abuse.
- Exact-SHA binding prevents stale or cross-deployment evidence promotion.
- Integrity verification prevents edited evidence files from receiving runtime credit.
- A public endpoint avoids storing a production credential solely to gather this non-sensitive proof.
- The endpoint is not a compliance certificate and cannot replace qualified legal review.

## Operational consequences

- CI validates implementation, contracts, lint, typecheck, build and focused security gates.
- Runtime capture is a separate deployment-bound action.
- The workstream remains incomplete while the artifact is `NOT_EXECUTED`, the deployment SHA is unknown, CI is not green or qualified review is absent.
- Production smoke and the final frozen-main closeout remain independent release gates.

## Alternatives considered

### Count repository tests as runtime proof

Rejected. This would not demonstrate what is deployed and would violate exact-SHA evidence requirements.

### Commit a synthetic PASS artifact

Rejected. Synthetic evidence may prove isolated behavior but cannot establish deployment URL, runtime release metadata or production/preview execution.

### Protect the endpoint with a long-lived secret

Rejected for this non-sensitive read-only proof. It would add secret-management and leakage risk without improving tenant security. Rate limiting and minimal output are sufficient.

### Infer the legal amendment date from the regulation's entry into force

Rejected. The act entered into force on 27 July 2026, while the new Article 5 prohibitions apply from 2 December 2026.

## Rollback

Rollback is code-only and does not require a database migration:

1. Revert the runtime endpoint, runtime evidence builder, capture workflow and scorer specialization.
2. Revert the legal-rules registry to the previous version only if a qualified review establishes that the new official-source mapping is incorrect.
3. Keep all previously captured artifacts immutable and mark them superseded rather than editing them.
4. Redeploy the last known-good SHA.
5. Confirm `/api/health`, protected readiness, the canonical decision-engine suite and the previous legal-rules tests.
6. Do not promote the prior `pending_official_publication` state merely to make CI green; legal-source accuracy controls the rollback decision.

## Evidence boundary

This decision proves engineering controls for source freshness, deterministic rule selection and exact-SHA runtime capture. It does not prove customer-specific applicability, legal sufficiency, certification, regulator acceptance or complete production readiness.
