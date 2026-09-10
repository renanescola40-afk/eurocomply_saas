# RISCK COMPLY — Legal + GDPR + EU AI Act Regulatory Closure Status

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V7`

This is an evidence/status register, not a legal opinion or compliance guarantee. Canonical detail: `docs/legal-assurance/LEGAL_CLOSURE_SCORECARD_V7.md`.

## Current truth

```text
CANONICAL_MAIN_SHA=0acf3de841b07b01bf9e132eaeb3a0e00a0d2a8f
PR_2025_V6_GDPR_LIFECYCLE_INTEGRITY=MERGED
PR_2026_DATA_GOVERNANCE_FOUNDATION_RECONCILIATION=MERGED
PR_2029_V7_RUNTIME_TRUTH_AND_PROOF_FIX=OPEN

GDPR_RIGHTS_SOURCE_IMPLEMENTATION=PASS_CANONICAL_SOURCE
GDPR_TERMINAL_STATE_IMMUTABILITY=PASS_CANONICAL_SOURCE
GDPR_LIFECYCLE_VERSION_INTEGRITY=PASS_CANONICAL_SOURCE
GDPR_LIFECYCLE_AUDIT_ATOMICITY=PASS_CANONICAL_SOURCE
DATA_GOVERNANCE_FOUNDATION=PASS_CANONICAL_SOURCE
DATA_GOVERNANCE_RUNTIME_V2=OPEN

INTERNAL_CONTROLLABLE_CLOSURE_PERCENT=80
INTERNAL_CONTROLLABLE_REMAINING_PERCENT=20
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=50
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=50
AI_ACT_TECHNICAL_PREPARATION=100_PERCENT_PREPARED
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEW_WEIGHT_ACCEPTED=0/51
MASTER_LEGAL_OPINION=OPEN
LEGAL_FINAL=BLOCKED
```

## Runtime proof reconciliation

Protected Data Governance run `34413535220` targeted `3349c1bf51c696e5d77106e3753c4a26cea8c033`. It reached the isolated Supabase proof stage but failed because the protected proof inputs for residency, a universal retention default and export encryption were empty. Artifact `10128230912` is failed diagnostic evidence only.

That run is also superseded because PR #2026 advanced canonical `main` to `0acf3de841b07b01bf9e132eaeb3a0e00a0d2a8f`.

## V7 proof correction

The failed run exposed a genuine proof-model mismatch: RISCK COMPLY uses class/category-specific retention, while the workflow demanded one universal `DATA_RETENTION_DEFAULT_DAYS` value.

PR #2029 corrects the harness rather than inventing a number:

```text
DATA_RETENTION_POLICY_MODE=category_specific
DATA_RETENTION_DEFAULT_DAYS=REMOVED_FROM_PROOF_INPUT
DATA_EXPORT_ENCRYPTION_REQUIRED=true
```

The runtime proof now checks that `public.data_retention_policies.retention_days` is a required integer and that the database constraint bounds category values to 1–3650 days. The strict validator requires `retentionPolicySchemaValid=true`.

The export-encryption value is source-controlled as the RISCK COMPLY operating requirement. It is not represented as an external provider certification.

## Remaining protected configuration

Connected Production Supabase evidence establishes:

```text
PRODUCTION_SUPABASE_PROJECT=tganhbbhfxcpblmgqprg
PRODUCTION_SUPABASE_REGION=eu-west-1
EXPECTED_DATA_RESIDENCY_REGION=eu-west-1
```

After PR #2029 merges, the only missing protected proof variable identified from the failed run is therefore:

```text
DATA_RESIDENCY_REGION=eu-west-1
```

It must actually exist in GitHub Environment `production-data-governance-proof`; this lane does not claim it is configured because the available GitHub connector cannot mutate Environment variables.

## Next valid runtime acceptance

Do not rerun the superseded SHA. After PR #2029 is merged through protected `main` and the residency variable exists, execute a **new** protected Data Governance Privacy Audit Proof against the exact then-current `main` SHA.

Required artifact:

```text
schema=risck-comply.data-governance-evidence.v2
status=Complete
outcome=passed
targetSha=<exact current protected main>
all required checks=true
```

Only then may `GDPR_RIGHTS_RUNTIME` / `DATA_GOVERNANCE_RUNTIME_V2` receive PASS credit.

## Final legal surfaces

```text
TERMS_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
PRIVACY_FINAL=BLOCKED_FOUNDER_PROVIDER_RUNTIME_AND_LEGAL_DECISIONS
DPA_FINAL=BLOCKED_FOUNDER_PROVIDER_AND_CONTRACT_DECISIONS
SUBPROCESSORS_FINAL=BLOCKED_PROVIDER_CONTRACT_AND_TRANSFER_FACTS
```

No contracting/operator entity, NIF/NIPC, registered office or signatory authority is inferred for final publication. Provider support/public materials may prove bounded provider facts but do not substitute for qualified legal acceptance.

## Qualified EU AI Act review

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

```text
LEGAL_8_OF_8=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
```

No AI-generated approval, self-review, CI result, provider-support response or synthetic signature can change these values.

## Critical path

1. finish protected checks on PR #2029;
2. merge PR #2029 only with owner authorization;
3. set `DATA_RESIDENCY_REGION=eu-west-1` in `production-data-governance-proof`;
4. run and validate a new exact-current-main Data Governance Runtime V2 proof;
5. reconcile GDPR runtime matrices from that retained artifact;
6. close remaining founder/entity and provider/account facts;
7. reconcile final Privacy, Terms, DPA and subprocessors/transfers;
8. obtain 8/8 qualified legal decisions and the Master Legal Opinion/equivalent conclusion.

## Authority boundary

```text
EMAIL_SEND_AUTHORIZED=false
PLMJ_ROUTE=PAUSED_BY_OWNER
PRODUCTION_DB_WRITE_AUTHORIZED=false
SYNTHETIC_LEGAL_ACCEPTANCE_FORBIDDEN=true
NO_MERGE_INFERRED_FROM_CONTINUE=true
```
