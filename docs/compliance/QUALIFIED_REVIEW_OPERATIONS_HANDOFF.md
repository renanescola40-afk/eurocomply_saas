# Qualified Review Operations Handoff

## Purpose

This runbook converts the final 51 weighted product-coverage points into eight executable external-review assignments without pretending that any review has occurred.

## Current boundary

- implementation coverage: 100%;
- CI-verified coverage: 100%;
- runtime evidence coverage: 100% after the final runtime closeout;
- completed coverage before accepted qualified reviews: 49%;
- remaining completion: 51%;
- decision remains `EU_AI_ACT_PRODUCT_COVERAGE_NO_GO`.

## Operating sequence

1. Run `Qualified Review Operations Handoff` on the exact target SHA.
2. Download `qualified-review-handoff-<sha>`.
3. Assign one qualified, independent reviewer to each review ID.
4. Verify identity, qualifications and conflicts before sharing raw evidence.
5. Share only the bounded evidence pack for the named workstream through the approved evidence channel.
6. Require findings, limitations, disposition, validity window and signature.
7. Validate the returned package using the canonical qualified-review campaign validator.
8. Store only sanitized metadata and digests in the repository; retain raw legal material in the approved external evidence vault.
9. Run the strict qualified-review workflow.
10. Promote the score only when every required package is accepted on the exact assessed SHA.

## Review assignments

| Review ID | Weight | Required reviewer profile |
|---|---:|---|
| legal-rules | 4 | EU AI Act counsel with regulatory change-control experience |
| prohibited-practices | 7 | Article 5 and fundamental-rights specialist |
| article-50-copy | 8 | Article 50 transparency and user-communications counsel |
| fria-methodology | 6 | Fundamental-rights impact assessment specialist |
| deployer-obligations | 7 | High-risk deployer governance specialist |
| high-risk-provider | 9 | Article 10 data-governance and statistical-bias specialist |
| conformity | 5 | Conformity, CE marking and EU registration specialist |
| gpai | 5 | GPAI and systemic-risk governance specialist |

## Fail-closed rules

A review remains incomplete when any of these is missing or invalid:

- named reviewer identity;
- qualification evidence;
- independence and conflict declaration;
- exact target SHA;
- evidence-pack digest;
- findings and limitations;
- signed disposition;
- review date and expiry;
- canonical schema validation;
- integrity digest.

Synthetic, placeholder, conflicted, expired, rejected or cross-SHA reviews never increase completed coverage.

## Owner action required

The repository owner must contract or appoint the eight qualified reviewers, provide them access to the bounded evidence packs, and obtain signed review packages. Automation cannot truthfully perform those acts.

## Truth boundary

An accepted review package proves that a named qualified person reviewed a defined evidence package. It does not certify the SaaS, guarantee customer compliance or represent regulator approval.
