# Baseline Truth Report

## Executive result

The repository is **not `COUNSEL_ACCEPTED`**. At source SHA `fbc61f3a5f069c23f9bc307789d12a53b5f87d34`, the product coverage registry defines 16 workstreams with total weight 100, but all eight qualified legal-review files are absent. Those reviews represent 51 points and currently receive zero human-review credit.

A referenced path, template, AI-generated finding, technical test, runtime artifact or implementation is not human legal acceptance.

## Baseline

| Field | Value |
|---|---|
| Repository | `renanescola40-afk/eurocomply_saas` |
| Product | Risck Comply |
| Branch | `main` |
| Source SHA | `fbc61f3a5f069c23f9bc307789d12a53b5f87d34` |
| Date | 30 July 2026 |
| Workstreams | 16 |
| Total weight | 100 |
| Qualified reviews | 8 |
| Qualified-review weight | 51 |
| Accepted human-review weight | 0 |
| Human legal acceptance | 0% |

PR #1402 was open during the baseline but changes only the Digital Twin impact service and its tests, so it does not conflict with this legal-preparation branch.

## Legal-source baseline

`src/server/ai-governance/legal-rules.ts` is version `2026-07-30.1` and represents Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744. It includes the revised Article 5 provisions, the Article 50 transition and the amended high-risk application dates. This is an engineering representation and still requires qualified legal confirmation.

## Missing accepted-review evidence

| Review | Weight | Expected path |
|---|---:|---|
| Legal rules | 4 | `docs/compliance/evidence/accepted/legal-rules-qualified-review.json` |
| Prohibited practices | 7 | `docs/compliance/evidence/accepted/prohibited-practices-legal-review.json` |
| Article 50 | 8 | `docs/compliance/evidence/accepted/article-50-copy-review.json` |
| FRIA | 6 | `docs/compliance/evidence/accepted/fria-methodology-review.json` |
| Deployer obligations | 7 | `docs/compliance/evidence/accepted/deployer-obligations-legal-review.json` |
| High-risk provider | 9 | `docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json` |
| Conformity | 5 | `docs/compliance/evidence/accepted/conformity-qualified-review.json` |
| GPAI | 5 | `docs/compliance/evidence/accepted/gpai-legal-review.json` |

No synthetic accepted file has been created. Future templates must remain invalid until a real reviewer supplies identity, professional registration, qualification scope, independence and conflict declarations, exact product SHA, evidence digest, decision, validity period and signed-artifact reference.

## Scorecard truth

The inspected article-function-evidence registry correctly marks rows dependent on qualified review as `HUMAN_REVIEW_REQUIRED`. No explicit human-review credit was found there.

The referenced file `artifacts/enterprise-readiness/enterprise-readiness-scorecard.json` is absent on the assessed SHA. Its status is `NOT_VERIFIED`, not PASS.

The new `scripts/compliance/legal-truth-audit.mjs` gate checks path existence, JSON validity, exact SHA, placeholders, validity dates, reviewer fields and accepted decision status. Strict mode fails if a row requires human-review evidence but grants another status.

## Current status

| Area | Status |
|---|---|
| Implementation path coverage | Computed by the truth audit |
| Test path coverage | Computed by the truth audit |
| Runtime evidence | Requires PASS and exact-SHA validation |
| AI pre-review | In progress |
| Ready for counsel | In progress |
| Human legal acceptance | 0% |
| Customer-specific compliance | Not assessed |
| Formal conformity | Not assessed |

## Remaining boundaries

Engineering must finish the product dossier, intended purpose, architecture/data flows, classification memo, source register, article matrix and eight review packages. Founder facts are still required for the legal entity, commercial terms, active subprocessors and operational commitments. A real lawyer must confirm the product characterisation, applicable roles, high-risk boundaries, legal methodologies, claims, contracts and Portuguese-law overlays.

This baseline may be described only as **legal-review preparation in progress**. It must not be described as counsel accepted, certified, regulator approved, fully compliant or guaranteed compliant.
