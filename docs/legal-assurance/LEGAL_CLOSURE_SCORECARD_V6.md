# RISCK COMPLY — Legal + GDPR + EU AI Act Closure Scorecard V6

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V6`

## Purpose

Track the remaining Legal Assurance closure without conflating repository-controlled preparation with qualified human legal acceptance.

This scorecard is not a legal opinion, certification, regulator approval or compliance guarantee.

## Release / branch boundary

```text
BASE_CANONICAL_MAIN_SHA=0028e597f7d94211d0294af57296044dfd5f1203
WORKING_BRANCH=legal/privacy-v6-lifecycle-integrity-20260909
WORKING_HEAD=RESOLVE_FROM_GITHUB_AT_REVIEW_TIME
PROTECTED_MAIN=true
```

## Closure score

```text
INTERNAL_CONTROLLABLE_CLOSURE=80_PERCENT
INTERNAL_CONTROLLABLE_REMAINING=20_PERCENT
TOTAL_LEGAL_ASSURANCE_CLOSURE=50_PERCENT
TOTAL_LEGAL_ASSURANCE_REMAINING=50_PERCENT
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
LEGAL_FINAL=BLOCKED
```

These percentages intentionally remain at the V5 working boundary. V5 withheld additional credit until protected CI/merge/runtime evidence, and V6 is a corrective integrity pass rather than a new legal-acceptance event.

## Repository-controlled controls

| Control | Status | Evidence / next gate |
|---|---|---|
| AI Act technical review packages | PREPARED | Eight canonical packages exist; human acceptance remains separate |
| Official legal-rule/source provenance | PREPARED | Continue date/material-change revalidation |
| Article 5 internal assessment | PREPARED | Qualified human decision required |
| Article 50 control plane / review material | PREPARED | Qualified human decision required |
| FRIA methodology / evidence package | PREPARED | Qualified human decision required |
| Deployer obligations package | PREPARED | Qualified human decision required |
| High-risk provider methodology package | PREPARED | Qualified human decision required |
| Conformity/CE/registration boundary pack | PREPARED | Qualified human decision required |
| GPAI workflow pack | PREPARED | Qualified human decision required |
| GDPR role matrix | PREPARED | Final case/account facts remain relevant |
| Articles 13/14 matrices | PREPARED / PARTIAL_PUBLICATION | Final notice depends on entity/provider/legal decisions |
| DPA Article 28 matrix | PREPARED | Final contract/entity/provider facts and legal acceptance open |
| International transfer register | PREPARED / FACTS_PARTIAL | Account-specific mechanisms/roles remain open |
| TOMs / Article 32 matrix | PREPARED | External/legal acceptance separate |
| Breach procedure/register | PREPARED | Operational exercises/evidence continue separately |
| DPO/DPIA screening | PREPARED | Reassess on factual/material changes |
| RoPA | PREPARED | Maintain against actual processing/provider changes |
| Retention schedule | PARTIAL | Fiscal/accounting period scoped; other provider/data cycles still evidence-bound |
| Canonical GDPR rights-request register | PASS_SOURCE_MERGED | PR #2014 merged |
| GDPR calendar-month deadline model | PASS_SOURCE_MERGED | Exact-SHA runtime proof pending |
| GDPR controller/processor routing | PASS_SOURCE_MERGED | Case-specific legal allocation remains open |
| GDPR terminal-state immutability | V6_FIX_PENDING_CI_MERGE | API pre-check plus atomic CAS predicate on expected status + `updated_at`; stale concurrent writers return 409 |
| GDPR lifecycle `updated_at` integrity | V6_FIX_PENDING_CI_MERGE | Refresh timestamp; audit compensation is also CAS-bound to the just-written version |
| Analytics consent source control | PASS_SOURCE_IMPLEMENTED | Consent-required fail-closed default, capture gating and withdrawal controls exist; exact Production config/legal basis remain open |
| Data Governance Runtime V2 | OPEN | Must be Complete/passed for exact post-V6 main SHA |
| Founder/entity final facts | OPEN_EXTERNAL_OWNER_FACT | Do not infer entity/NIF/address/signatory |
| Provider DPA/SCC/account facts | PARTIAL_EXTERNAL | Account-specific/provider evidence + legal interpretation required |
| Final Privacy/Terms/DPA publication | OPEN | Depends on factual and qualified legal gates |

## Qualified human review — non-substitutable

| # | Workstream | Status | Required terminal evidence |
|---:|---|---|---|
| 1 | LEGAL_RULES | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |
| 2 | ARTICLE_5 | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |
| 3 | ARTICLE_50 | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |
| 4 | FRIA | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |
| 5 | DEPLOYER_OBLIGATIONS | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |
| 6 | HIGH_RISK_PROVIDER | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |
| 7 | CONFORMITY | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |
| 8 | GPAI | PENDING_EXTERNAL_REVIEW | Attributable qualified decision |

```text
QUALIFIED_ACCEPTED=0/8
QUALIFIED_REVIEW_WEIGHT_ACCEPTED=0
MASTER_LEGAL_OPINION=OPEN
```

No repository commit, AI analysis, automated reviewer, CI check, public guidance, provider support statement or synthetic signature can satisfy this table.

## Valid qualified-decision record

For credit, retain at minimum:

1. reviewer identity;
2. relevant qualification/expertise;
3. jurisdiction / professional scope;
4. independence/conflict position where applicable;
5. substantive scope actually reviewed;
6. exact product/package/evidence subject reviewed;
7. explicit disposition (`ACCEPTED`, `CHANGES_REQUIRED`, or justified `NOT_APPLICABLE`);
8. findings/rationale and limitations;
9. attributable signed/authenticated response;
10. date, validity period/material-change triggers.

## V6 GDPR integrity findings

Post-merge review of V5 found two non-cosmetic defects, followed by a concurrency finding during V6 review.

### P1 — terminal request reopening / stale-write race

Canonical main allowed a terminal rights request to be moved back to an active lifecycle state. The first V6 pass added an API pre-check, but review correctly identified that two concurrent PATCH requests could both read the same active version and race.

V6 therefore uses optimistic concurrency at the database update itself:

- the lifecycle PATCH still rejects records already observed as terminal;
- the write additionally requires both the previously observed `status` and `updated_at` to match in the `UPDATE` predicate;
- a stale writer that loses the race updates no row and returns `request_state_conflict` / HTTP 409;
- this protects terminal immutability and also prevents two different nonterminal transitions from silently overwriting one another.

### P2 — stale `updated_at`

Canonical main did not refresh `updated_at` on lifecycle PATCH operations. V6 records the mutation timestamp and includes it in the optimistic concurrency token.

If audit persistence fails, compensation is itself bound to the status + `updated_at` of the just-written record. A later concurrent legitimate write therefore cannot be overwritten by stale compensation.

Regression contracts cover terminal rejection, status/version predicates, 409 conflicts, timestamp refresh and CAS-bound compensation.

## Exact-SHA runtime gate for GDPR rights

`DATA_SUBJECT_RIGHTS` cannot become runtime PASS until all are true:

```text
V6_PROTECTED_CI=PASS
V6_MERGED_TO_PROTECTED_MAIN=true
POST_V6_MAIN_SHA=KNOWN_EXACT_40_CHAR_SHA
DATA_GOVERNANCE_RUNTIME_PROOF=EXECUTED
EVIDENCE_SCHEMA=risck-comply.data-governance-evidence.v2
EVIDENCE_STATUS=Complete
EVIDENCE_OUTCOME=passed
EVIDENCE_TARGET_SHA=POST_V6_MAIN_SHA
ALL_REQUIRED_DATA_GOVERNANCE_CHECKS=true
```

Until then:

```text
GDPR_RIGHTS_SOURCE=IMPLEMENTED
GDPR_RIGHTS_RUNTIME=OPEN
ISSUE_2009=OPEN
```

## External factual blockers

The following cannot be fabricated to improve the score:

- final RISCK COMPLY contracting/operator entity;
- NIF/NIPC and registered office for that final entity;
- authorised signatory authority;
- account-specific provider DPA/SCC incorporation where not proven;
- final controller/processor/transfer conclusions;
- provider-specific downstream deletion/restriction/rectification completion;
- qualified legal decisions;
- Master Legal Opinion.

## Current shortest path

1. protect V6 branch through CI and review;
2. merge V6 normally if protected requirements pass;
3. run exact-SHA Data Governance Runtime Proof;
4. close #2009 only to the level supported by retained runtime evidence;
5. continue provider/DPA/transfer factual closure;
6. obtain final founder/entity facts when owner designates the operating structure;
7. reconcile final public legal documents;
8. obtain 8/8 qualified legal decisions;
9. obtain Master Legal Opinion/equivalent consolidated qualified conclusion;
10. only then evaluate `LEGAL_FINAL=PASS`.

## Communication / mutation boundary

```text
EMAIL_SEND_AUTHORIZED=false
PLMJ_ROUTE=PAUSED_BY_OWNER
PRODUCTION_DB_WRITE_AUTHORIZED=false
SYNTHETIC_LEGAL_ACCEPTANCE_FORBIDDEN=true
```
