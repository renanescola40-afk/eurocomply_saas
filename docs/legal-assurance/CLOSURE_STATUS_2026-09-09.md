# RISCK COMPLY — Legal + GDPR + EU AI Act Regulatory Closure Status

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V7`

This document is an evidence/status register. It is not a legal opinion and does not convert repository work, CI, AI analysis or internal review into qualified legal acceptance.

Canonical detailed scorecard: `docs/legal-assurance/LEGAL_CLOSURE_SCORECARD_V7.md`.

## Current canonical truth

```text
CANONICAL_MAIN_SHA=0acf3de841b07b01bf9e132eaeb3a0e00a0d2a8f
PR_2005=MERGED
PR_2008=MERGED
PR_2011=MERGED
PR_2012=MERGED
PR_2014=MERGED
PR_2025_V6_GDPR_LIFECYCLE_INTEGRITY=MERGED
PR_2026_DATA_GOVERNANCE_FOUNDATION_RECONCILIATION=MERGED

AI_ACT_TECHNICAL_PREPARATION=100_PERCENT_PREPARED
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEW_WEIGHT_ACCEPTED=0/51
MASTER_LEGAL_OPINION=OPEN

GDPR_RIGHTS_SOURCE_IMPLEMENTATION=MERGED
GDPR_TERMINAL_STATE_IMMUTABILITY=PASS_SOURCE_MERGED
GDPR_LIFECYCLE_UPDATED_AT_INTEGRITY=PASS_SOURCE_MERGED
GDPR_LIFECYCLE_AUDIT_ATOMICITY=PASS_SOURCE_MERGED
DATA_GOVERNANCE_FOUNDATION=PASS_SOURCE_MERGED
GDPR_RIGHTS_RUNTIME_ACCEPTANCE=PENDING_EXACT_CURRENT_MAIN_PROOF

INTERNAL_CONTROLLABLE_CLOSURE_PERCENT=80
INTERNAL_CONTROLLABLE_REMAINING_PERCENT=20
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=50
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=50

TERMS_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
PRIVACY_FINAL=BLOCKED_FOUNDER_PROVIDER_RUNTIME_AND_LEGAL_DECISIONS
DPA_FINAL=BLOCKED_FOUNDER_PROVIDER_AND_CONTRACT_DECISIONS
SUBPROCESSORS_FINAL=BLOCKED_PROVIDER_CONTRACT_AND_TRANSFER_FACTS
LEGAL_FINAL=BLOCKED
ENTERPRISE_100=NO
```

The percentages are working closure estimates, not a compliance score. V6 and the data-governance foundation reconciliation materially strengthened the implementation but do not create qualified legal acceptance and do not receive runtime credit until the protected exact-SHA evidence gate passes.

## GDPR rights implementation — canonical source closed

Canonical source now contains one tenant-scoped rights-request data plane covering intake and lifecycle handling for access/export, rectification, restriction, deletion, objection, portability and consent withdrawal.

The merged V6 path provides:

- terminal-state immutability;
- optimistic concurrency using the previously observed state/version;
- monotonic lifecycle timestamps;
- atomic domain mutation + canonical audit-chain append;
- service-role-only database mutation authority;
- HTTP conflict handling for stale writers;
- regression coverage for these invariants.

Accordingly:

```text
GDPR_RIGHTS_SOURCE=IMPLEMENTED
GDPR_RIGHTS_RUNTIME=OPEN
```

Software can record and enforce the workflow boundary. It cannot decide legal exceptions, controller/processor allocation, provider propagation outcomes or case-specific rights conclusions without attributable facts and, where required, qualified judgment.

## Data-governance foundation — canonical source reconciled

PR #2026 advanced canonical `main` after V6 and added the forward-only reconciliation needed to materialize the canonical governance relations without migration-history repair:

- `public.data_retention_policies`;
- `public.data_subject_requests`;
- `public.audit_integrity_checkpoints`.

The reconciliation enables and forces RLS, removes browser mutation authority and preserves service-role server ownership for mutations. The subsequent lifecycle migration remains the authority that evolves the legacy rights-request schema to the current GDPR lifecycle contract.

This source reconciliation does not by itself prove the Production/runtime state.

## Data Governance Runtime V2 — prior run is stale and non-crediting

Protected run `34413535220` targeted the former current-main SHA:

```text
3349c1bf51c696e5d77106e3753c4a26cea8c033
```

That SHA was superseded when PR #2026 merged. The run therefore cannot satisfy exact-current-main acceptance even if retried.

Before failure, the run successfully validated the protected environment governance and exact-SHA execution envelope and reconstructed the isolated Supabase database. The runtime proof then failed preconditions because these protected environment variables were empty:

```text
DATA_RESIDENCY_REGION
DATA_RETENTION_DEFAULT_DAYS
DATA_EXPORT_ENCRYPTION_REQUIRED
```

Artifact `10128230912` is retained as failed diagnostic evidence only. It must not receive PASS credit.

## Protected environment factual reconciliation

Current attributable facts allow one of the three missing variables to be resolved without inference:

```text
PRODUCTION_SUPABASE_PROJECT=tganhbbhfxcpblmgqprg
PRODUCTION_SUPABASE_REGION=eu-west-1
DATA_RESIDENCY_REGION_EXPECTED=eu-west-1
```

The export operating policy requires authenticated, expiring, encrypted delivery with access logging. Therefore `DATA_EXPORT_ENCRYPTION_REQUIRED=true` may represent the declared product operating requirement when configured; it must not be described as an external encryption certification.

`DATA_RETENTION_DEFAULT_DAYS` remains unresolved. The repository intentionally uses category-specific retention handling and draft category targets and does not currently establish one universal, counsel-approved, runtime-proven numeric default for all data. A number must not be invented solely to obtain a green workflow.

## Exact-current-main runtime acceptance contract

The next valid proof must be a **new protected workflow execution** against the exact protected `main` SHA current at execution time.

It must produce:

```text
EVIDENCE_SCHEMA=risck-comply.data-governance-evidence.v2
EVIDENCE_STATUS=Complete
EVIDENCE_OUTCOME=passed
EVIDENCE_TARGET_SHA=CURRENT_PROTECTED_MAIN_AT_EXECUTION
ALL_REQUIRED_CHECKS=true
```

Failed, superseded or wrong-SHA artifacts receive zero final credit.

## Privacy / Articles 13 and 14

Internal preparation includes field-level provision mapping, Article 14 indirect-collection scenarios, first-communication source/purpose/privacy disclosure for teammate invitation flows, selected legitimate-interest pre-review material and scoped Portuguese fiscal/accounting retention analysis.

Final public Privacy acceptance remains open because entity facts, provider/recipient/transfer facts, residual legal-basis decisions and qualified legal acceptance are not all closed.

## Founder/company identity — fail closed

No company identity, NIF/NIPC, registered office or signatory authority is inferred merely to close the gate.

```text
FOUNDER_FACTS_FINAL_ACCEPTANCE=OPEN
RISCK_COMPLY_CONTRACTING_ENTITY=UNDECIDED_FOR_FINAL_LEGAL_PUBLICATION
RISCK_COMPLY_OPERATOR_ENTITY=UNDECIDED_FOR_FINAL_LEGAL_PUBLICATION
REGISTERED_OFFICE=OPEN_PENDING_AUTHORITATIVE_EVIDENCE
NIF_NIPC=OPEN_PENDING_AUTHORITATIVE_EVIDENCE
SIGNATORY_AUTHORITY=OPEN_PENDING_AUTHORITATIVE_EVIDENCE
```

## DPA / provider / transfer truth boundary

Internal matrices and provider factual evidence are strong preparation. Final acceptance remains open where account-specific facts or legal conclusions are not attributable.

Remaining categories include, as applicable:

- final contracting/operator entity alignment;
- remaining account-specific DPA/SCC/transfer evidence;
- controller/processor role conclusions;
- Chapter V mechanism applicability;
- provider/subprocessor notice and authorisation mechanics;
- account-specific retention/deletion behavior;
- customer DPA annex details and contractual allocation.

Public provider documentation or support correspondence may prove bounded provider facts, but neither is treated as a substitute for qualified legal acceptance.

## Qualified EU AI Act review — 0/8 accepted

| Workstream | Status |
|---|---|
| LEGAL_RULES | PENDING_EXTERNAL_REVIEW |
| ARTICLE_5 | PENDING_EXTERNAL_REVIEW |
| ARTICLE_50 | PENDING_EXTERNAL_REVIEW |
| FRIA | PENDING_EXTERNAL_REVIEW |
| DEPLOYER_OBLIGATIONS | PENDING_EXTERNAL_REVIEW |
| HIGH_RISK_PROVIDER | PENDING_EXTERNAL_REVIEW |
| CONFORMITY | PENDING_EXTERNAL_REVIEW |
| GPAI | PENDING_EXTERNAL_REVIEW |

A valid decision requires attributable reviewer identity/qualification, jurisdiction or professional scope, substantive review scope, actual evidence subject, explicit disposition and rationale, limitations/reliance, date/current validity and attributable authentication/signature.

```text
LEGAL_8_OF_8=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
```

No AI-generated approval, self-review, CI result, provider-support response, synthetic signature or checkbox can change those values.

## Current critical path

1. resolve the genuine retention operating model/default required by the protected Data Governance proof;
2. configure the protected environment with attributable values only;
3. run a new exact-current-main Data Governance Runtime V2 proof;
4. reconcile GDPR runtime matrices only to the level proved by the retained artifact;
5. continue provider/account DPA, transfer, retention and subprocessor factual closure;
6. establish final founder/entity/signatory facts with authoritative evidence;
7. reconcile final public Privacy, Terms, DPA and related legal surfaces;
8. obtain eight genuine qualified AI Act review decisions;
9. obtain the consolidated Master Legal Opinion or equivalent bounded qualified conclusion;
10. only then promote `LEGAL_FINAL` and dependent Enterprise gates.

## Authority boundary

```text
EMAIL_SEND_AUTHORIZED=false
PLMJ_ROUTE=PAUSED_BY_OWNER
PRODUCTION_DB_WRITE_AUTHORIZED=false
SYNTHETIC_LEGAL_ACCEPTANCE_FORBIDDEN=true
NO_MERGE_INFERRED_FROM_CONTINUE=true
```
