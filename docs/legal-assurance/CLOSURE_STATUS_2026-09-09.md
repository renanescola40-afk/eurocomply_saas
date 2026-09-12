# RISCK COMPLY — Legal + GDPR + EU AI Act Regulatory Closure Status

Date: 2026-09-12  
Mode: `LEGAL_TERMINAL_CLOSURE`

This is an evidence/status register, not a legal opinion, certification, regulator approval or compliance guarantee. Qualified human acceptance is never inferred from repository work, provider correspondence or CI. Canonical detail remains in `docs/legal-assurance/LEGAL_CLOSURE_SCORECARD_V7.md`.

## Current release truth

```text
OBSERVED_PROTECTED_MAIN_SHA=2ba88fc0b3f6a75c4c70b1bfdfaa53d6b6a0985a
PRODUCTION_DEPLOYMENT_ID=dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9
PRODUCTION_RELEASE_SHA=13b19410caa20045b19d98d58df406c43433af5a
VERCEL_DEPLOYMENT_STATE=READY
PRODUCTION_MAIN_RELATION=CURRENT_MAIN_AHEAD_OF_OBSERVED_PRODUCTION_RELEASE
PR_2031_PRIVACY_REVIEW_SURFACE=MERGED
PR_2032_DPA_REVIEW_SURFACE=MERGED
PR_2035_SUBPROCESSORS_TRANSFERS_RECONCILIATION=MERGED
PR_2040_TERMS_REVIEW_SURFACE=MERGED
PR_2041_CANONICAL_LEGAL_RECONCILIATION=MERGED
PR_2058_OWNER_TERMS_RECONCILIATION=MERGED
PR_2059_PUBLIC_OPERATOR_BOUNDARY=MERGED
GDPR_RIGHTS_ISSUE_2009=CLOSED
```

Direct connected validation on 2026-09-12 confirms that the observed Vercel deployment serving `www.risckcomply.com` remains READY at Production SHA `13b19410...`. Protected `main` is ahead of that observed Production release. Exact-current-main Production equality and overall Production release readiness are therefore not claimed.

## Public legal surfaces

The current public legal surfaces remain deliberately non-effective review drafts:

```text
PRIVACY_PUBLIC_REVIEW_SURFACE=LIVE
PRIVACY_VERSION=0.2-review
PRIVACY_PUBLICATION_STATE=REVIEW_DRAFT_HUMAN_REVIEW_REQUIRED
TERMS_PUBLIC_REVIEW_SURFACE=LIVE
TERMS_VERSION=0.2-review
TERMS_PUBLICATION_STATE=REVIEW_DRAFT_HUMAN_REVIEW_REQUIRED
DPA_REVIEW_SOURCE=MERGED
SUBPROCESSORS_TRANSFERS_REVIEW_SOURCE=MERGED
FINAL_LEGAL_PUBLICATION=BLOCKED
```

Their existence does not satisfy qualified legal review.

## Accepted technical GDPR evidence

The previously accepted Data Governance Runtime V2 proof remains valid for the exact historical SHA it tested:

```text
DATA_GOVERNANCE_RUNTIME_V2=PASS_EXACT_SHA
DATA_GOVERNANCE_RUNTIME_TARGET_SHA=a921445a675bf3652568603535c148eb4e977914
DATA_GOVERNANCE_RUNTIME_RUN=34448768687
DATA_GOVERNANCE_RUNTIME_ARTIFACT=10140768157
DATA_GOVERNANCE_RUNTIME_ARTIFACT_DIGEST=sha256:361aa2f26da1cb1641b33fc2e4a638f576f12968aa0545cb80f7e1d0f765a299
GDPR_RIGHTS_SOURCE_IMPLEMENTATION=PASS
GDPR_RIGHTS_RUNTIME_GATE=PASS_EXACT_SHA
```

This proves the scoped technical schema/security/release controls only. It does not prove downstream provider deletion, case-specific GDPR outcomes or legal sufficiency.

## Entity / seller truth

The owner has explicitly designated the same existing Portuguese company as operator, customer contracting entity and seller for RISCK COMPLY:

```text
RISCK_COMPLY_OPERATOR_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_CONTRACTING_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_SELLER_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
CONTRACTING_SELLER_ENTITY_DECISION=CLOSED_OWNER_ATTRIBUTABLE
RISCK_COMPLY_TRADE_NAME=RISCK_COMPLY
AUTHORITATIVE_REGISTRY_EVIDENCE=PENDING
REGISTERED_OFFICE=PENDING_AUTHORITATIVE_EVIDENCE
REGISTERED_IDENTIFIERS=PENDING_AUTHORITATIVE_EVIDENCE
SIGNATORY_AUTHORITY=PENDING_WHERE_REQUIRED
ENTITY_FACTS_FINAL_PUBLICATION=BLOCKED
```

This closes the former owner-decision blocker about which company will contract with and invoice customers. It does not itself establish authoritative registered office/company identifiers, VAT status, signatory authority or final legal publication readiness.

## CAE / activity-registration boundary

The owner states that the SaaS CAE/activity association has not yet been completed and is intentionally deferred until the final administrative phase:

```text
SOFTWARE_SAAS_CAE_ASSOCIATED=false
SOFTWARE_SAAS_CAE_ACTION=DEFERRED_BY_OWNER_UNTIL_FINAL_ADMINISTRATIVE_PHASE
CAE_CHANGE_AUTHORIZED_NOW=false
```

Other lanes must not create, alter or infer a CAE merely to close legal, billing or procurement gates. Final CAE/activity reconciliation must use authoritative company/activity facts and the competent Portuguese administrative/tax route.

## Owner commercial positions already attributable

Existing owner decisions/communications establish the following positions for counsel review:

```text
SELF_SERVICE_CANCELLATION=END_OF_PAID_PERIOD
REFUND_DEFAULT=NO_DEFAULT_REFUND_SUBJECT_TO_MANDATORY_LAW_AND_SIGNED_ORDER_FORM
POST_TERMINATION_EXPORT_WINDOW=30_DAYS_OWNER_POSITION
DEFAULT_UPTIME_SLA=NONE_UNLESS_CONTRACTED
GOVERNING_LAW_PREFERENCE=PORTUGAL_SUBJECT_TO_COUNSEL_REVIEW
CONTRACTING_SELLER_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA
OWNER_COMMERCIAL_POSITIONS=PARTIAL_SELECTED_PENDING_QUALIFIED_REVIEW
```

These are owner-selected commercial positions, not legally approved clauses. Liability caps/carve-outs, indemnities, breach cure/suspension mechanics, notice mechanics and other material risk-allocation questions remain open until deliberately selected and reviewed.

## Provider factual evidence advanced

Attributable provider correspondence and connected read-only validation materially narrow previously open provider-framework facts:

```text
SUPABASE_DPA_PROVIDER_CONFIRMATION=PROVIDER_CONFIRMED_INCORPORATED_IN_TERMS_FOR_CUSTOMERS_FROM_2026_08_01
SUPABASE_CURRENT_PLAN=PRO_CONNECTED_ACCOUNT
SUPABASE_ACCOUNT_DPA_APPLICABILITY=GENERAL_FRAMEWORK_SUPPORTED_EXCEPTION_CHECK_OPEN
SUPABASE_TRANSFER_TIA_ACCOUNT_INTERPRETATION=OPEN
POSTHOG_DPA_COMPLETION_EVIDENCE=COMPLETED_BY_ALL_PARTICIPANTS_FOR_SAMUEL_CERQUEIRA_UNIPESSOAL_LDA
POSTHOG_PRODUCTION_RUNTIME_CONFIG=PASS_ATTRIBUTABLE
POSTHOG_PRODUCTION_PROJECT_BINDING=OPEN_EXTERNAL_ACCOUNT_ACCESS
POSTHOG_TRANSFER_RETENTION_LEGAL_INTERPRETATION=OPEN
STRIPE_LIVE_ACCOUNT_DISCOVERY=PASS
STRIPE_ENTITY_TAX_RECONCILIATION=OPEN
PROVIDER_FACTUAL_RECONCILIATION=PARTIAL_ADVANCED
```

Provider DPA evidence does not itself establish all transfer mechanisms, all processing locations, retention or qualified transfer conclusions.

## Qualified EU AI Act review

| Workstream | Current state |
|---|---|
| LEGAL_RULES | PENDING_EXTERNAL_REVIEW |
| ARTICLE_5 | PENDING_EXTERNAL_REVIEW |
| ARTICLE_50 | PENDING_EXTERNAL_REVIEW |
| FRIA | PENDING_EXTERNAL_REVIEW |
| DEPLOYER | PENDING_EXTERNAL_REVIEW |
| HIGH_RISK_PROVIDER | PENDING_EXTERNAL_REVIEW |
| CONFORMITY | PENDING_EXTERNAL_REVIEW |
| GPAI | PENDING_EXTERNAL_REVIEW |

```text
LEGAL_8_OF_8=0/8_ACCEPTED
QUALIFIED_REVIEWS_ACCEPTED=0
MASTER_LEGAL_OPINION=OPEN
```

No internal artifact, AI conclusion, CI result, public guidance or provider-support response changes those values.

## Conservative closure score

```text
INTERNAL_CONTROLLABLE_CLOSURE_PERCENT=80
INTERNAL_CONTROLLABLE_REMAINING_PERCENT=20
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=50
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=50
AI_ACT_TECHNICAL_PREPARATION=100_PERCENT_PREPARED
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
LEGAL_FINAL=BLOCKED
```

The existing 80/50 working scores are retained rather than manufacturing a new percentage. The seller/contracting decision is now closed, but no canonical weighting rule converts that factual improvement into a new aggregate percentage.

## Shortest remaining critical path

1. authoritative registry evidence for `SAMUEL CERQUEIRA, UNIPESSOAL LDA`, including the registered facts required for final instruments;
2. close seller/VAT regime and supported B2B tax matrix through attributable tax/accounting authority evidence;
3. finish account-specific provider facts and Chapter V/transfer conclusions, including the actual PostHog Production project/account;
4. resolve the remaining material owner Terms risk-allocation decisions;
5. give qualified reviewers the bounded current review packs and collect attributable decisions for all eight AI Act workstreams;
6. apply any required deltas and obtain the consolidated Master Legal Opinion/equivalent qualified conclusion;
7. complete the owner-deferred SaaS CAE/activity administrative reconciliation in the final administrative phase;
8. only then promote Privacy, Terms, DPA, subprocessors/transfers and publication status to final/effective.

## Authority boundary

```text
EMAIL_SEND_AUTHORIZED=false
PRODUCTION_DB_WRITE_AUTHORIZED=false
CAE_CHANGE_AUTHORIZED_NOW=false
SYNTHETIC_LEGAL_ACCEPTANCE_FORBIDDEN=true
NO_DOCUMENTATION_LOOP=true
```

No email is authorised for sending by this register. Drafting and preparation remain allowed.
