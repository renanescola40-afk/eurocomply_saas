# Legal Rules Registry — Counsel Review Package

**Status:** `HUMAN_REVIEW_REQUIRED`  
**Weight:** 4  
**Decision output:** `docs/compliance/evidence/accepted/legal-rules-qualified-review.json`

## Review objective

Confirm that the versioned legal-rules registry accurately converts the applicable EU AI Act provisions into bounded operational rules without erasing legally material conditions, exceptions, dates or role distinctions.

## Materials to review

- `src/server/ai-governance/legal-rules.ts`
- `src/server/ai-governance/legal-rules-runtime.ts`
- `src/server/ai-governance/decision-engine.ts`
- `docs/legal-review-preparation/07_LEGAL_SOURCE_REGISTER.json`
- `docs/legal-review-preparation/08_ARTICLE_FUNCTION_EVIDENCE_MATRIX.json`
- `docs/security/evidence/runtime/legal-rules-validation.json`

## Required legal decisions

1. Confirm the authoritative-source mapping for Regulations (EU) 2024/1689 and 2026/1744.
2. Confirm application dates and transition periods, including Article 50 and high-risk timelines.
3. Confirm the amended Article 5 operational wording and its exception/escalation boundaries.
4. Confirm that rule status and precedence cannot cause a future or superseded rule to be treated as currently binding.
5. Identify national-law or guidance dependencies that must remain outside deterministic automation.

## Pre-review findings

- **LR-01 — High:** the 2026 amendment is implemented but not legally approved.
- **LR-02 — Medium:** operational summaries must be tested against legally material statutory conditions.
- **LR-03 — High:** exact-SHA runtime evidence must be recaptured for the reviewed deployment.

## Acceptance boundary

An accepted decision must contain reviewer identity, professional registration, jurisdiction, qualification scope, independence/conflict declarations, exact product SHA, evidence-package digest, signed artifact reference, decision digest, validity period and timestamp. Anything less remains `HUMAN_REVIEW_REQUIRED`.
