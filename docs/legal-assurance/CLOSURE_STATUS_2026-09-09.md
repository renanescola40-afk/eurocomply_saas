# RISCK COMPLY — Legal + GDPR + EU AI Act Regulatory Closure Status

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V6`

This document is an evidence/status register. It is not a legal opinion and does not convert repository work, CI, AI analysis or internal review into qualified legal acceptance.

## Current truth boundary

```text
BASE_CANONICAL_MAIN_SHA=0028e597f7d94211d0294af57296044dfd5f1203
WORKING_BRANCH=legal/privacy-v6-lifecycle-integrity-20260909
WORKING_BRANCH_HEAD=RESOLVE_FROM_GITHUB_AT_REVIEW_TIME
AI_ACT_TECHNICAL_PREPARATION=100_PERCENT_PREPARED
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEW_STAGE_REMAINING=100_PERCENT
MASTER_LEGAL_OPINION=OPEN
LEGAL_RULES_REVIEW=PENDING_EXTERNAL_REVIEW
ARTICLE_5_REVIEW=PENDING_EXTERNAL_REVIEW
ARTICLE_50_REVIEW=PENDING_EXTERNAL_REVIEW
FRIA_REVIEW=PENDING_EXTERNAL_REVIEW
DEPLOYER_OBLIGATIONS_REVIEW=PENDING_EXTERNAL_REVIEW
HIGH_RISK_PROVIDER_REVIEW=PENDING_EXTERNAL_REVIEW
CONFORMITY_REVIEW=PENDING_EXTERNAL_REVIEW
GPAI_REVIEW=PENDING_EXTERNAL_REVIEW
PR_2008=MERGED
PR_2011=MERGED
PR_2012=MERGED
PR_2014=MERGED
GDPR_RIGHTS_SOURCE_IMPLEMENTATION=MERGED
GDPR_RIGHTS_RUNTIME_ACCEPTANCE=PENDING_EXACT_SHA_PROOF
GDPR_RIGHTS_V6_INTEGRITY_FIX=WORKING_BRANCH_PENDING_CI_MERGE
CANONICAL_MAIN_INTERNAL_CLOSURE_PERCENT=80
V6_WORKING_INTERNAL_CLOSURE_PERCENT=80
V6_WORKING_INTERNAL_REMAINING_PERCENT=20
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=50
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=50
TERMS_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
PRIVACY_FINAL=BLOCKED_FOUNDER_PROVIDER_RUNTIME_AND_LEGAL_DECISIONS
DPA_FINAL=BLOCKED_FOUNDER_PROVIDER_AND_CONTRACT_DECISIONS
SUBPROCESSORS_FINAL=BLOCKED_PROVIDER_CONTRACT_AND_TRANSFER_FACTS
LEGAL_FINAL=BLOCKED
ENTERPRISE_100=NO
```

The percentages above are working closure estimates only. V5 explicitly withheld additional credit until CI/merge/runtime evidence; V6 therefore does not award extra percentage merely for correcting post-merge defects.

## Superseded status statements

Earlier content in this file described PR #2011 as open and issue #2009 as not implemented. That is no longer current.

PR #2014, `Privacy V5: canonical GDPR rights-request lifecycle`, merged on 2026-09-09. It evolved the existing `public.data_subject_requests` data plane rather than creating a competing DSAR table and added the canonical lifecycle for Chapter III request intake, identity state, role routing, calendar-month deadline tracking, extension evidence, decisions and evidence references.

The merge itself does **not** satisfy the exact-SHA runtime acceptance requirement.

## GDPR rights V5 source implementation

Canonical source now includes:

- one canonical tenant-scoped `data_subject_requests` lifecycle;
- request types for access/export, rectification, restriction, deletion, objection, portability and consent withdrawal;
- `received_at`, `initial_due_at`, `due_at`, identity-verification state/timestamps, role routing, customer-controller reference, extension reason/notice/deadline, decision/rationale, evidence references and completion state;
- one-calendar-month operational deadline computation instead of a fixed 30-day substitute;
- bounded 1- or 2-month extension inputs requiring reason and notification evidence;
- RLS/FORCE RLS and removal of direct browser mutation authority;
- server-side tenant-scoped mutation and `manage_settings` authorization;
- canonical `/api/gdpr/requests` intake/admin path and `/api/gdpr/requests/[id]` lifecycle path;
- binding of the existing deletion-request flow to a durable canonical request record before success is claimed;
- data-governance runtime evidence schema `risck-comply.data-governance-evidence.v2`.

```text
CANONICAL_RIGHTS_REQUEST_REGISTER=PASS_SOURCE_IMPLEMENTED_MERGED
DEADLINE_MODEL=PASS_SOURCE_IMPLEMENTED
CONTROLLER_PROCESSOR_ROUTING=PASS_SOURCE_IMPLEMENTED
EXTENSION_EVIDENCE_MODEL=PASS_SOURCE_IMPLEMENTED
DIRECT_BROWSER_MUTATION=DENIED_BY_SOURCE_CONTROL
DATA_GOVERNANCE_RUNTIME_V2=REQUIRED_NOT_YET_CREDITED_FOR_CURRENT_SHA
```

## V6 post-merge integrity correction

Review of the merged V5 source identified two real lifecycle-integrity defects on canonical main:

1. terminal records (`completed`, `rejected`, `cancelled`) could be transitioned back to an active state by a later lifecycle PATCH, including `start_processing`;
2. lifecycle PATCH operations did not refresh `updated_at`, making the returned last-modified timestamp inaccurate after a state change.

V6 corrects those defects on `legal/privacy-v6-lifecycle-integrity-20260909` by:

- treating terminal request states as immutable at the HTTP lifecycle authority boundary and returning HTTP 409 for attempted mutation;
- explicitly updating `updated_at` for successful lifecycle mutations;
- allowing compensation to restore the previous `updated_at` together with the other previous values if audit persistence fails;
- adding contract regression assertions for terminal-state immutability and timestamp refresh.

Until V6 passes protected CI and merges, these corrections are **not** canonical-main credit.

```text
TERMINAL_LIFECYCLE_IMMUTABILITY=V6_FIX_PENDING_CI_MERGE
LIFECYCLE_UPDATED_AT_INTEGRITY=V6_FIX_PENDING_CI_MERGE
```

## Exact-SHA runtime acceptance gate

The data-governance evidence validator requires:

- schema `risck-comply.data-governance-evidence.v2`;
- status `Complete`;
- outcome `passed`;
- a valid exact 40-character `targetSha`;
- every required protected check to be true.

Therefore neither PR #2014 nor V6 may promote `DATA_SUBJECT_RIGHTS=PASS` merely because source/tests exist.

Required sequence:

1. V6 protected CI passes;
2. V6 merges normally through protected `main`;
3. the resulting exact current `main` SHA becomes the runtime subject;
4. the protected Data Governance Runtime Proof executes against the governed isolated/recovery database path;
5. retained evidence validates as `Complete/passed` for that exact SHA;
6. only then may runtime-dependent fields in `DATA_SUBJECT_RIGHTS_MATRIX.md` receive runtime PASS credit.

## Rights that remain substantively partial after runtime source closure

The canonical lifecycle can record requests and attributable decisions, but software must not invent the legal decision or downstream-provider outcome.

The following remain separate from source implementation:

- whether a specific restriction, objection or erasure exception applies;
- controller-versus-processor legal allocation for a particular customer dataset;
- downstream deletion/restriction/correction propagation at each relevant provider;
- portability applicability and exact data set/format for a specific request;
- consent-withdrawal effect for every configured non-essential processing surface;
- legal hold, tax/accounting, fraud/security or other retention exceptions in a particular case.

These require attributable facts and, where judgment is legal, qualified review.

## Privacy / Articles 13 and 14

The repository has materially improved Articles 13/14 preparation through:

- field-level data-provision mapping;
- Portuguese fiscal/accounting retention scoping where applicable;
- Article 14 indirect-collection scenario/timing register;
- first-communication source/purpose/privacy disclosure for teammate invitation flows;
- legitimate-interest pre-review material for selected controller-side processing.

The public Privacy surface is still not promoted to final legal acceptance because entity facts, provider/recipient/transfer facts, residual legal-basis decisions and qualified review remain open.

## Founder/company identity — fail closed

No company identity, NIF/NIPC, registered office, operator linkage or signatory authority is inferred merely to close the gate.

Current external-assurance authority keeps the RISCK COMPLY contracting/operator entity and final founder/entity acceptance open until the owner actually designates the structure and attributable evidence exists.

```text
FOUNDER_FACTS_FINAL_ACCEPTANCE=OPEN
RISCK_COMPLY_CONTRACTING_ENTITY=UNDECIDED
RISCK_COMPLY_OPERATOR_ENTITY=UNDECIDED
REGISTERED_OFFICE=OPEN_PENDING_AUTHORITATIVE_ENTITY_DECISION_AND_EVIDENCE
NIF_NIPC=OPEN_PENDING_AUTHORITATIVE_ENTITY_DECISION_AND_EVIDENCE
```

## DPA / provider / transfer truth boundary

Internal matrices and provider factual evidence are strong preparation, but final acceptance remains open where account-specific or legal facts are not proven.

Open categories include, as applicable:

- final contracting/operator entity alignment;
- account-specific DPA incorporation/acceptance;
- controller/processor role conclusions;
- Chapter V transfer mechanism applicability;
- provider/subprocessor notice and authorisation mechanics;
- account-specific retention/deletion cycles;
- customer-specific DPA annex details and final contractual allocation.

Runtime presence or public provider documentation alone is not treated as final account-specific DPA/SCC acceptance.

## Qualified EU AI Act review model

Eight canonical workstreams remain prepared but not accepted:

| Workstream | Human acceptance |
|---|---|
| LEGAL_RULES | PENDING_EXTERNAL_REVIEW |
| ARTICLE_5 | PENDING_EXTERNAL_REVIEW |
| ARTICLE_50 | PENDING_EXTERNAL_REVIEW |
| FRIA | PENDING_EXTERNAL_REVIEW |
| DEPLOYER_OBLIGATIONS | PENDING_EXTERNAL_REVIEW |
| HIGH_RISK_PROVIDER | PENDING_EXTERNAL_REVIEW |
| CONFORMITY | PENDING_EXTERNAL_REVIEW |
| GPAI | PENDING_EXTERNAL_REVIEW |

A valid workstream decision requires attributable reviewer identity and qualifications, jurisdiction/professional scope, independence/conflict position where applicable, substantive review scope, actual product/package/evidence reviewed, explicit disposition and rationale, authenticated/signed response, date, limitations and validity/material-change triggers.

```text
LEGAL_8_OF_8=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
```

No AI-generated approval, internal self-review, CI result, provider-support response, synthetic signature or checkbox can change those values.

## Current critical path

1. close V6 lifecycle-integrity defects through protected CI and merge;
2. run and retain exact-SHA Data Governance Runtime Proof on the resulting current main;
3. reconcile `DATA_SUBJECT_RIGHTS_MATRIX.md` only to the level actually proven by that runtime evidence;
4. continue provider/account DPA, transfer, retention and subprocessor factual closure without inference;
5. complete final founder/entity facts only after the owner designates the actual RISCK COMPLY operating/contracting structure;
6. reconcile final public Privacy, Terms and DPA only after their factual/legal inputs are established;
7. obtain eight genuine qualified human EU AI Act decisions;
8. obtain the consolidated Master Legal Opinion or equivalent accepted qualified conclusion;
9. only then promote `LEGAL_FINAL` and any dependent Enterprise gate.

## External communication boundary

```text
EMAIL_SEND_AUTHORIZED=false
PLMJ_ROUTE=PAUSED_BY_OWNER
```

No lawyer, regulator, clinic or reviewer outreach is sent by this lane without a separate explicit owner authorization. No Production database write is authorized by this document.
