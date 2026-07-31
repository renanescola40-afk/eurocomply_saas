# ADR — Counsel Review Efficiency and Material-Change Routing

- **Date:** 2026-07-30
- **Status:** Accepted for repository preparation
- **Legal acceptance:** `HUMAN_REVIEW_REQUIRED`

## Context

The legal-review programme already provides a truth baseline, eight qualified-review packages, contract/privacy drafts, a final publication gate and an exact-SHA handoff bundle.

The remaining repository-controlled inefficiency was repeat review. After remediation or product evolution, counsel could be forced to rediscover which global decisions and workstreams changed, even when only one bounded topic was affected.

The product also had partner-counsel boundaries but not a complete collaboration draft or a dedicated confidentiality and privilege protocol.

## Decision

Add a separate counsel-efficiency layer that:

1. gives counsel a ten-minute review cockpit;
2. maintains a canonical decision and path-impact catalogue;
3. computes exact-SHA deltas between a reviewed base and candidate head;
4. classifies proposed re-review as none, limited or full;
5. routes limited review to explicit decisions and workstream packages;
6. fails closed for unclassified production, legal or compliance paths;
7. keeps every generated result non-crediting;
8. provides a full partner-counsel agreement review draft;
9. defines handling for confidential and potentially privileged material;
10. expands the existing counsel handoff bundle with this layer.

## Materiality rules

- legal-source, intended-purpose and classification changes require full re-review;
- contracts, privacy, claims, providers, data flows and bounded workstream changes require limited re-review by default;
- formatting-only or non-substantive internal documentation changes may require no re-review;
- unclassified changes under production, migration, legal-preparation or compliance paths fail closed to limited review;
- absence of a reviewed base SHA requires full review.

Counsel may always widen or narrow scope with reasons.

## Truth boundary

The delta engine cannot:

- approve a legal position;
- verify professional standing;
- create privilege;
- sign an opinion;
- guarantee customer compliance;
- certify the product;
- replace a notified body or regulator.

`counselAccepted` remains false in every generated artifact.

## Alternatives considered

### Require full review after every commit

Rejected because it is expensive, slow and discourages timely remediation.

### Let engineering decide that no review is needed

Rejected because legal materiality must remain reviewable and counsel retains override authority.

### Embed legal decisions directly in code

Rejected because legal opinions and professional responsibility cannot be reduced to an automated status or public repository template.

## Consequences

Positive:

- less counsel discovery time;
- smaller re-review scope after remediation;
- exact-SHA traceability;
- clearer founder, counsel and engineering responsibilities;
- safer partner model.

Costs:

- the impact catalogue must be maintained as the architecture changes;
- false negatives are controlled through conservative fallback classification;
- counsel still must review primary sources and affected material;
- founder facts and signed decisions remain external blockers.

## Rollback

Remove the counsel-efficiency workflow, script, tests and folder. Restore the previous handoff generator directory list. Existing truth, review-package, contract and publication gates continue to operate independently.