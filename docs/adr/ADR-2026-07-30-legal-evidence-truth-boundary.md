# ADR: Separate technical evidence from human legal acceptance

- Date: 30 July 2026
- Status: Accepted for engineering implementation; legal methodology remains subject to counsel review

## Context

The EU AI Act product registries reference eight qualified-review evidence paths with total weight 51. Referenced paths can be absent, stale, invalid, bound to another SHA or populated with placeholders. Technical implementation and runtime evidence cannot substitute for an independent professional decision.

## Decision

Risck Comply will maintain separate states for implementation, tests, runtime verification, AI pre-review, readiness for counsel, counsel acceptance, customer-specific review and formal conformity.

A qualified review receives legal credit only when a real record proves reviewer identity, professional registration, qualification scope, independence/conflict assessment, exact product SHA, evidence digest, accepted decision, validity period, signed artifact and decision digest.

Technical statuses such as `IMPLEMENTED_RUNTIME_PENDING` remain valid and must not be confused with legal acceptance. Missing accepted-review files remain `HUMAN_REVIEW_REQUIRED`.

## Consequences

- Eight missing accepted-review paths currently earn zero human-review weight.
- CI detects fabricated or unsupported legal-credit statuses.
- Reports expose separate technical and legal metrics rather than one blended percentage.
- Confidential signed reviews stay outside the public repository; Git stores only safe metadata, hashes and references.
- Final counsel re-review can be limited to material changes bound to a new SHA.

## Rollback

The workflow and scripts can be removed without changing product runtime behaviour. Generated reports are informational artifacts. Rollback must not restore any scoring logic that grants legal credit to missing, placeholder, stale or AI-generated review evidence.
