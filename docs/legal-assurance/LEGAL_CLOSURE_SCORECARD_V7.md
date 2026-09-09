# RISCK COMPLY — Legal + GDPR + EU AI Act Closure Scorecard V7

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V7`

## Purpose

Record the post-V6 Legal Assurance truth without converting source work, CI or AI analysis into qualified legal acceptance.

This document is not a legal opinion, certification, regulator approval or compliance guarantee.

## Canonical release boundary

```text
CANONICAL_MAIN_SHA=0acf3de841b07b01bf9e132eaeb3a0e00a0d2a8f
PR_2025_V6_GDPR_LIFECYCLE_INTEGRITY=MERGED
PR_2026_DATA_GOVERNANCE_FOUNDATION_RECONCILIATION=MERGED
PR_2029_V7_RUNTIME_TRUTH_AND_PROOF_FIX=OPEN
PROTECTED_MAIN=true
```

## Closure score

```text
INTERNAL_CONTROLLABLE_CLOSURE=80_PERCENT
INTERNAL_CONTROLLABLE_REMAINING=20_PERCENT
TOTAL_LEGAL_ASSURANCE_CLOSURE=50_PERCENT
TOTAL_LEGAL_ASSURANCE_REMAINING=50_PERCENT
AI_ACT_TECHNICAL_PREPARATION=100_PERCENT_PREPARED
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEW_WEIGHT_ACCEPTED=0/51
MASTER_LEGAL_OPINION=OPEN
LEGAL_FINAL=BLOCKED
```

The next material internal credit event remains a valid exact-current-main Data Governance Runtime V2 proof and the evidence-backed legal matrix reconciliation that follows it.

## Repository-controlled controls

| Control | Current status | Evidence / next gate |
|---|---|---|
| Eight AI Act technical review packages | PREPARED | Genuine qualified human acceptance remains separate |
| Article 5 / Article 50 / FRIA / deployer / provider / conformity / GPAI internal packages | PREPARED | Qualified decisions required |
| GDPR role, Articles 13/14, DPA, transfer, TOMs, RoPA, breach, DPO/DPIA material | PREPARED / FACTS_PARTIAL | Final entity/provider/legal facts remain bounded separately |
| Retention policy model | CATEGORY_SPECIFIC | No fabricated universal day count; PR #2029 proves bounded per-category schema instead |
| Canonical GDPR rights-request register | PASS_SOURCE_MERGED | PR #2014 + PR #2025 integrity controls |
| GDPR terminal-state immutability | PASS_SOURCE_MERGED | Atomic CAS boundary merged in PR #2025 |
| GDPR lifecycle version/timestamp integrity | PASS_SOURCE_MERGED | Monotonic lifecycle boundary merged in PR #2025 |
| GDPR lifecycle mutation + audit atomicity | PASS_SOURCE_MERGED | Canonical server transaction path merged in PR #2025 |
| Data-governance foundation | PASS_SOURCE_MERGED | PR #2026 forward reconciliation |
| Data Governance Runtime V2 | OPEN | New exact-current-main protected proof required after PR #2029 merges and protected residency fact is configured |
| Analytics consent source control | PASS_SOURCE_IMPLEMENTED | Production configuration/legal-basis acceptance remains separate |
| Founder/entity final facts | OPEN_EXTERNAL_OWNER_FACT | No entity/NIF/address/signatory inference |
| Provider DPA/SCC/account facts | PARTIAL_EXTERNAL | Remaining account/legal facts are not inferred |
| Final Privacy / Terms / DPA publication | OPEN | Depends on factual and qualified legal gates |

## Data Governance Runtime V2 — prior run is non-crediting

Protected run `34413535220` targeted SHA:

```text
3349c1bf51c696e5d77106e3753c4a26cea8c033
```

It validated the protected execution envelope and reached the isolated Supabase proof stage, then failed because three proof inputs were empty. It is now additionally stale because PR #2026 advanced canonical `main` to `0acf3de841b07b01bf9e132eaeb3a0e00a0d2a8f`.

Artifact `10128230912` remains diagnostic failed evidence only.

## PR #2029 — remove false universal-retention dependency

The failed proof exposed a modelling defect: the workflow required `DATA_RETENTION_DEFAULT_DAYS`, while the actual RISCK COMPLY policy is class/category-specific and does not truthfully define one universal retention period.

PR #2029 corrects that proof contract rather than inventing a number:

```text
DATA_RETENTION_POLICY_MODE=category_specific
DATA_EXPORT_ENCRYPTION_REQUIRED=true
DATA_RETENTION_DEFAULT_DAYS=REMOVED_FROM_PROOF_INPUT
```

The runtime proof now requires the canonical `data_retention_policies.retention_days` field to be non-null integer data and verifies the database check constraint bounds category-specific values to `1..3650` days. The strict evidence validator also requires `retentionPolicySchemaValid=true`.

This change proves the configured retention **model/schema boundary**. It does not claim every category-specific period is legally approved or operationally enforced forever; those remain subject to applicable purpose, legal duty, customer agreement, provider lifecycle and material-change review.

## Protected environment facts after PR #2029

| Fact | Attributable truth | Proof input |
|---|---|---|
| Production Supabase residency | `eu-west-1` | `DATA_RESIDENCY_REGION=eu-west-1` must exist in protected environment |
| Retention model | category-specific | source-controlled `DATA_RETENTION_POLICY_MODE=category_specific` |
| Governed export encryption requirement | required | source-controlled `DATA_EXPORT_ENCRYPTION_REQUIRED=true` |

After PR #2029 merges, the only remaining missing protected proof variable identified from the failed run is the provider-factual residency declaration. The GitHub connector available to this lane cannot mutate Environment variables, so no value is represented as configured until it actually exists there.

## Exact-current-main acceptance contract

A valid Data Governance Runtime V2 PASS requires a **new** protected run against the then-current protected `main`:

```text
TARGET_SHA=CURRENT_PROTECTED_MAIN_AT_EXECUTION
EVIDENCE_SCHEMA=risck-comply.data-governance-evidence.v2
EVIDENCE_STATUS=Complete
EVIDENCE_OUTCOME=passed
EVIDENCE_TARGET_SHA=TARGET_SHA
ALL_REQUIRED_CHECKS=true
FAILED_OR_SUPERSEDED_ARTIFACTS_RECEIVE_ZERO_CREDIT=true
```

Until that artifact exists:

```text
GDPR_RIGHTS_SOURCE=IMPLEMENTED
GDPR_RIGHTS_RUNTIME=OPEN
DATA_GOVERNANCE_RUNTIME_V2=OPEN
```

## Qualified human review — non-substitutable

| # | Workstream | Status |
|---:|---|---|
| 1 | LEGAL_RULES | PENDING_EXTERNAL_REVIEW |
| 2 | ARTICLE_5 | PENDING_EXTERNAL_REVIEW |
| 3 | ARTICLE_50 | PENDING_EXTERNAL_REVIEW |
| 4 | FRIA | PENDING_EXTERNAL_REVIEW |
| 5 | DEPLOYER_OBLIGATIONS | PENDING_EXTERNAL_REVIEW |
| 6 | HIGH_RISK_PROVIDER | PENDING_EXTERNAL_REVIEW |
| 7 | CONFORMITY | PENDING_EXTERNAL_REVIEW |
| 8 | GPAI | PENDING_EXTERNAL_REVIEW |

```text
LEGAL_8_OF_8=0/8_ACCEPTED
QUALIFIED_REVIEW_WEIGHT_ACCEPTED=0/51
MASTER_LEGAL_OPINION=OPEN
```

No repository commit, AI-generated conclusion, automated review, CI result, provider-support statement, synthetic identity or synthetic signature can satisfy these workstreams.

## Genuine remaining legal/factual blockers

- final RISCK COMPLY contracting/operator entity, registered facts and signatory authority;
- remaining account-specific provider DPA/SCC/transfer facts and legal interpretation;
- final controller/processor/transfer conclusions for the actual operating model;
- final customer-facing Privacy, Terms and DPA acceptance;
- eight attributable qualified AI Act review decisions;
- consolidated Master Legal Opinion or equivalent bounded qualified conclusion.

## Current shortest path

1. get PR #2029 protected checks green and merge only with owner authorization;
2. configure `DATA_RESIDENCY_REGION=eu-west-1` in the protected `production-data-governance-proof` Environment;
3. execute a new Data Governance Runtime V2 proof against the exact then-current protected `main`;
4. reconcile GDPR runtime matrices only to the level proven by that artifact;
5. close founder/entity and remaining provider/account facts;
6. reconcile final Privacy, Terms, DPA, subprocessors/transfers and publication language;
7. obtain 8/8 genuine qualified review decisions;
8. obtain the Master Legal Opinion/equivalent consolidated qualified conclusion;
9. only then evaluate `LEGAL_FINAL=PASS`.

## Authority boundary

```text
EMAIL_SEND_AUTHORIZED=false
PLMJ_ROUTE=PAUSED_BY_OWNER
PRODUCTION_DB_WRITE_AUTHORIZED=false
SYNTHETIC_LEGAL_ACCEPTANCE_FORBIDDEN=true
NO_MERGE_INFERRED_FROM_CONTINUE=true
```
