# Article 5 Prohibited Practices — Counsel Review Package

**Status:** `HUMAN_REVIEW_REQUIRED` · **Weight:** 7

Review the Article 5 workflow, signal taxonomy, evidence requirements, exception analysis, decision ledger and the 2026 amendments concerning non-consensual intimate material and child sexual abuse material.

## Core materials

- `src/app/api/ai-governance/prohibited-practices/route.ts`
- `src/server/queries/prohibited-practices.ts`
- `src/server/ai-governance/legal-rules.ts`
- relevant API, migration and decision-engine tests
- `docs/security/evidence/runtime/prohibited-practices-validation.json`

## Counsel decisions

Confirm the trigger conditions, exceptions, required evidence, amended application date, fail-closed behaviour and circumstances that must always be escalated. No workflow result may be described as a final legal determination.

## Open findings

- **PP-01 Critical:** market-access consequences require qualified legal sign-off.
- **PP-02 High:** amended purpose, consent, safeguards and “without right” conditions require article-level confirmation.
- **PP-03 High:** exact-SHA runtime evidence remains a condition of acceptance.

The only creditable output is a completed, signed and digest-bound decision at `docs/compliance/evidence/accepted/prohibited-practices-legal-review.json`.
