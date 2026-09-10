# RISCK COMPLY — Legal + GDPR + EU AI Act Regulatory Closure Status

Date: 2026-09-10  
Mode: `LEGAL_TERMINAL_CLOSURE`

This is an evidence/status register, not a legal opinion, certification, regulator approval or compliance guarantee. Qualified human acceptance is never inferred from repository work, provider correspondence or CI. Canonical detail remains in `docs/legal-assurance/LEGAL_CLOSURE_SCORECARD_V7.md`.

## Current release truth

```text
OBSERVED_PROTECTED_MAIN_SHA=c00379cc6564bb4f76a17089295e6724e8dcae7c
PRODUCTION_DEPLOYMENT_ID=dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9
PRODUCTION_RELEASE_SHA=13b19410caa20045b19d98d58df406c43433af5a
PRODUCTION_READY=true
PRODUCTION_MAIN_RELATION=ONE_MERGED_CI_DIAGNOSTIC_COMMIT_BEHIND
PR_2031_PRIVACY_REVIEW_SURFACE=MERGED
PR_2032_DPA_REVIEW_SURFACE=MERGED
PR_2035_SUBPROCESSORS_TRANSFERS_RECONCILIATION=MERGED
PR_2040_TERMS_REVIEW_SURFACE=MERGED
PR_2041_CANONICAL_LEGAL_RECONCILIATION=MERGED
GDPR_RIGHTS_ISSUE_2009=CLOSED
```

The current public Production deployment is healthy and serves the post-legal-surface release at SHA `13b19410...`. Protected `main` is at `c00379cc...`; the intervening merge is CI/release-diagnostic work rather than a material legal-page rewrite. This is documented continuity, not an assertion that Production equals exact current `main`.

## Public legal surfaces

Direct Production validation on 2026-09-10 established:

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

The public review surfaces deliberately remain non-effective and fail closed on unresolved factual/legal dependencies. Their existence does not satisfy qualified legal review.

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

## Entity / operator truth

Later attributable owner/operator correspondence supersedes the old `UNDECIDED` operating-entity placeholder for review preparation:

```text
RISCK_COMPLY_OPERATOR_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_CONTRACTING_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_TRADE_NAME=RISCK_COMPLY
AUTHORITATIVE_REGISTRY_EVIDENCE=PENDING
REGISTERED_OFFICE=PENDING_AUTHORITATIVE_EVIDENCE
REGISTERED_IDENTIFIERS=PENDING_AUTHORITATIVE_EVIDENCE
SIGNATORY_AUTHORITY=PENDING_WHERE_REQUIRED
ENTITY_FACTS_FINAL_PUBLICATION=BLOCKED
```

The owner designation is sufficient to stop presenting the entity as undecided to reviewers. It is not sufficient to publish unverified registry fields. Final Privacy/Terms/DPA entity identity remains blocked until attributable registry evidence resolves the required registered facts.

## Owner commercial positions already attributable

Existing owner correspondence records the following positions for counsel review:

```text
SELF_SERVICE_CANCELLATION=END_OF_PAID_PERIOD
REFUND_DEFAULT=NO_DEFAULT_REFUND_SUBJECT_TO_MANDATORY_LAW_AND_SIGNED_ORDER_FORM
POST_TERMINATION_EXPORT_WINDOW=30_DAYS_OWNER_POSITION
DEFAULT_UPTIME_SLA=NONE_UNLESS_CONTRACTED
GOVERNING_LAW_PREFERENCE=PORTUGAL_SUBJECT_TO_COUNSEL_REVIEW
OWNER_COMMERCIAL_POSITIONS=PARTIAL_SELECTED_PENDING_QUALIFIED_REVIEW
```

These are owner-selected commercial positions, not legally approved clauses. Liability caps/carve-outs, indemnities, breach cure/suspension mechanics, notice mechanics and other material risk-allocation questions remain open until deliberately selected and reviewed.

## Provider factual evidence advanced

Attributable provider/account correspondence materially narrows two previously open DPA facts:

```text
SUPABASE_DPA_PROVIDER_CONFIRMATION=PROVIDER_CONFIRMED_INCORPORATED_IN_TERMS_FOR_CUSTOMERS_FROM_2026_08_01
SUPABASE_TRANSFER_TIA_ACCOUNT_INTERPRETATION=OPEN
POSTHOG_DPA_COMPLETION_EVIDENCE=COMPLETED_BY_ALL_PARTICIPANTS_FOR_SAMUEL_CERQUEIRA_UNIPESSOAL_LDA
POSTHOG_PRODUCTION_PROJECT_BINDING=OPEN
POSTHOG_TRANSFER_RETENTION_LEGAL_INTERPRETATION=OPEN
STRIPE_ACCOUNT_LEGAL_DETAIL=OPEN
PROVIDER_FACTUAL_RECONCILIATION=PARTIAL_ADVANCED
```

Provider DPA evidence does not itself establish Production project attribution, SCC/TIA sufficiency, all processing locations, retention or qualified transfer conclusions.

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

The existing 80/50 working scores are retained rather than manufacturing a new percentage. Repository-controlled state has materially advanced, but no canonical weighting rule converts those merges and factual improvements into a higher total legal-assurance percentage.

## Shortest remaining critical path

1. obtain authoritative registry evidence for the owner-designated operating/contracting entity and reconcile the required registered facts;
2. close seller/VAT regime and supported B2B tax matrix through attributable owner/accountant/tax-authority evidence;
3. finish account-specific provider facts and Chapter V/transfer conclusions, including the actual PostHog Production project if analytics is active;
4. resolve the remaining material owner Terms risk-allocation decisions;
5. give qualified reviewers the bounded current review packs and collect attributable decisions for all eight AI Act workstreams;
6. apply any required deltas and obtain the consolidated Master Legal Opinion/equivalent qualified conclusion;
7. only then promote Privacy, Terms, DPA, subprocessors/transfers and publication status to final/effective.

## Authority boundary

```text
EMAIL_SEND_AUTHORIZED=false
PRODUCTION_DB_WRITE_AUTHORIZED=false
SYNTHETIC_LEGAL_ACCEPTANCE_FORBIDDEN=true
NO_DOCUMENTATION_LOOP=true
```

No email is authorised for sending by this register. Drafting and preparation remain allowed.