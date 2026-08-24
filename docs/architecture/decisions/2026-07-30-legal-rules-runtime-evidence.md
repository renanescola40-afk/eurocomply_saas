# ADR — Exact-SHA runtime evidence for versioned EU AI Act legal rules

- **Date:** 2026-07-30
- **Status:** Accepted for implementation; runtime promotion pending
- **Decision owners:** Principal Engineering, Security, SRE, EU AI Act Product Architecture
- **Scope:** `legal-rules.ts`, canonical decision engine, coverage registry, protected runtime validation and evidence promotion

## Context

The product already had a versioned EU AI Act registry and a canonical decision engine, but the `LEGAL-RULES` workstream had no runtime evidence. The registry also described the 2026 Article 5 amendment as adopted but pending official publication.

Regulation (EU) 2026/1744 was published in the Official Journal on 24 July 2026 and entered into force on 27 July 2026. The amended Article 5(1), first subparagraph, points (ba) and (bb), and Article 5(1a) and (1b) apply from 2 December 2026. The same act establishes the revised high-risk application dates and the provider-only Article 111(4) transition for Article 50(2).

A repository test alone cannot prove that a deployment is running the intended legal-rules version. A runtime artifact must be bound to the exact deployed SHA, URL, environment, test outcomes and integrity digest.

A Vercel deployment-specific `*.vercel.app` URL can be intercepted by Deployment Protection before the application function executes. A protection-layer response may set cookies, which must not be accepted as Legal Rules application evidence. Automatic Production capture therefore separates deployment authority from capture origin: the trusted Vercel `deployment_status` event supplies the exact expected SHA, while the protected runtime endpoint is called through the canonical Production origin `https://www.risckcomply.com`.

## Decision

1. Use the Official Journal ELI for Regulation (EU) 2026/1744 as the authoritative source for amended rules.
2. Represent entry into force and individual provision application dates separately.
3. Version all legal rules with `AI_ACT_LEGAL_RULES_VERSION` and include `sourceRegulation` per rule.
4. Fail closed when a rule derived from Regulation (EU) 2026/1744 does not point to the official act or carries the wrong publication date.
5. Expose a protected, read-only runtime validation endpoint at `/api/ops/legal-rules-validation`.
6. Apply fail-closed internal-authentication rate limiting before validating `INTERNAL_CRON_SECRET` or `CRON_SECRET`.
7. Bind runtime evidence to a full 40-character deployment SHA using the repository's canonical runtime release metadata.
8. For automatic trusted Vercel `deployment_status` capture, use `https://www.risckcomply.com` as the canonical Production origin while taking the expected SHA from the deployment event and separately requiring it to remain the current remote `main` SHA.
9. Fail closed if the canonical Production origin reports any deployment SHA other than the trusted event SHA; this explicitly covers alias-convergence delay.
10. Keep explicitly supplied approved HTTPS origins, including `*.vercel.app`, available only for controlled manual fallback; do not weaken cookie, host, SHA or integrity checks to accommodate deployment-protection responses.
11. Return HTTP 503 when runtime provenance or any legal-rule test case fails.
12. Apply `no-store`, anti-framing, no-referrer, no-index and `nosniff` headers.
13. Sanitize request identifiers and never retain authorization, cookies, secrets, customer data or evidence payloads.
14. Compute a deterministic legal-rules digest and artifact SHA-256.
15. Make the coverage scorer accept this specialized artifact only when repository, SHA, URL, environment, all test cases and integrity hash pass.
16. Commit a `NOT_EXECUTED` placeholder at the canonical path, deliberately rejected by the scorer until a real deployment is tested.

## Security and privacy consequences

- The endpoint exposes rule metadata outcomes and release provenance only after internal token authentication; it contains no customer or tenant data.
- Authentication attempts are distributed-rate-limited before token verification.
- The capture workflow obtains the credential from GitHub secrets and never persists the Authorization header.
- Automatic Production capture never sends the internal secret to a deployment-specific Vercel URL merely because it appeared in an event; the target is the reviewed canonical Production origin.
- Exact-SHA binding is preserved because the trusted deployment event SHA, current remote `main` SHA, checked-out SHA and runtime-reported SHA must agree.
- Integrity verification prevents edited evidence files from receiving runtime credit.
- Any `Set-Cookie` response remains a hard failure; deployment-protection behavior is handled by selecting the correct Production capture origin, not by weakening the validator.
- The endpoint is not a compliance certificate and cannot replace qualified legal review.

## Operational consequences

- CI validates implementation, contracts, lint, typecheck, build and focused security gates.
- Runtime capture is a separate deployment-bound action requiring the same secret on the deployment and in the protected GitHub workflow.
- A trusted Vercel Production deployment event authorizes assessment of its exact SHA but automatic capture is performed through `https://www.risckcomply.com`.
- If the canonical Production alias still serves an older deployment, runtime SHA equality fails closed until alias convergence; operators must not relabel prior evidence or relax the SHA check.
- Deployment-specific Vercel URLs behind Deployment Protection are not evidence failures in the application when the request never reaches the runtime function; they are an operational access-path condition.
- The workstream remains incomplete while the artifact is `NOT_EXECUTED`, the deployment SHA is unknown, CI is not green or qualified review is absent.
- Production smoke and the final frozen-main closeout remain independent release gates.

## Alternatives considered

### Count repository tests as runtime proof

Rejected. This would not demonstrate what is deployed and would violate exact-SHA evidence requirements.

### Commit a synthetic PASS artifact

Rejected. Synthetic evidence may prove isolated behavior but cannot establish deployment URL, runtime release metadata or production/preview execution.

### Disable cookie rejection for Vercel deployment URLs

Rejected. A `Set-Cookie` response can originate from Deployment Protection before the application executes. Accepting it would blur the boundary between edge access control and application runtime proof. Automatic Production capture instead uses the canonical Production origin while preserving exact-SHA verification.

### Use the deployment event's `environment_url` as the automatic Production target

Rejected. The event remains authoritative for deployment state and exact SHA, but a deployment-specific URL can be protected independently of the public Production alias. Exact release proof is stronger when the application is exercised through the canonical Production origin and independently required to report the trusted event SHA.

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
