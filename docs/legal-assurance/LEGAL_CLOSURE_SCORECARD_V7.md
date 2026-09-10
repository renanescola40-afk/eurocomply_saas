# RISCK COMPLY — Legal + GDPR + EU AI Act Closure Scorecard V7

Date: 2026-09-10  
Mode: `LEGAL_TERMINAL_CLOSURE`

## Purpose

Record current Legal Assurance truth without converting source work, CI, owner correspondence, provider statements or AI analysis into qualified legal acceptance.

This document is not a legal opinion, certification, regulator approval or compliance guarantee.

## Release boundary

```text
OBSERVED_PROTECTED_MAIN_SHA=c00379cc6564bb4f76a17089295e6724e8dcae7c
PRODUCTION_DEPLOYMENT_ID=dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9
PRODUCTION_RELEASE_SHA=13b19410caa20045b19d98d58df406c43433af5a
PRODUCTION_READY=true
PRODUCTION_MAIN_RELATION=ONE_MERGED_CI_DIAGNOSTIC_COMMIT_BEHIND
PROTECTED_MAIN=true
```

The post-legal-surface Production release is serving successfully. Current protected `main` is one later CI/release-diagnostic merge ahead; exact-current-main Production equality is therefore not claimed.

## Closure score

```text
INTERNAL_CONTROLLABLE_CLOSURE=80_PERCENT
INTERNAL_CONTROLLABLE_REMAINING=20_PERCENT
TOTAL_LEGAL_ASSURANCE_CLOSURE=50_PERCENT
TOTAL_LEGAL_ASSURANCE_REMAINING=50_PERCENT
AI_ACT_TECHNICAL_PREPARATION=100_PERCENT_PREPARED
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEWS_ACCEPTED=0
MASTER_LEGAL_OPINION=OPEN
FINAL_LEGAL_PUBLICATION=BLOCKED
LEGAL_FINAL=BLOCKED
```

The 80/50 working scores remain conservative because the repository still has no canonical weighting model that would justify inventing a new aggregate percentage. The underlying control states below supersede stale sequencing from earlier versions of this scorecard.

## Repository-controlled controls

| Control | Current status | Evidence / next gate |
|---|---|---|
| Eight AI Act technical review packages | PREPARED | Genuine qualified human acceptance required |
| GDPR rights request architecture | PASS_SOURCE_AND_EXACT_SHA_GATE | Case-specific legal decisions and downstream effects remain separate |
| Data Governance Runtime V2 | PASS_EXACT_SHA | Run `34448768687`, target SHA `a921445...`, artifact `10140768157` |
| Public Privacy review structure | PASS_CANONICAL_MAIN_AND_LIVE_REVIEW_SURFACE | Entity/provider/legal-basis/DPO/qualified-review gates remain |
| Public DPA review structure | PASS_CANONICAL_MAIN | Entity, provider/transfer facts and qualified Art. 28 review remain |
| Subprocessors / Transfers review structure | PASS_CANONICAL_MAIN | Account-specific contracts, locations, mechanisms and qualified Chapter V decisions remain |
| Public Terms review structure | PASS_CANONICAL_MAIN_AND_LIVE_REVIEW_SURFACE | Final risk allocation, tax facts, entity registry facts and qualified review remain |
| Public claims guard posture | PASS_SAFE_BOUNDARY | Continue blocking unsupported certification/compliance guarantees |
| Owner/operator entity selection | OWNER_DESIGNATED | Authoritative registry facts still required before final publication |
| Provider DPA factual evidence | PARTIAL_ADVANCED | Supabase and PostHog facts advanced; transfer/project/account details remain |
| VAT/seller tax model | OPEN_EXTERNAL_FACT | Accountant/tax-authority/Stripe evidence required |
| Master Legal Opinion | OPEN_EXTERNAL | Only after valid 8/8 workstream outcomes |

## Accepted historical exact-SHA Data Governance proof

Protected run **34448768687** executed against exact protected `main` SHA:

```text
a921445a675bf3652568603535c148eb4e977914
```

Accepted retained evidence:

```text
EVIDENCE_SCHEMA=risck-comply.data-governance-evidence.v2
EVIDENCE_STATUS=Complete
EVIDENCE_OUTCOME=passed
EVIDENCE_TARGET_SHA=a921445a675bf3652568603535c148eb4e977914
WORKFLOW_RUN_ID=34448768687
ARTIFACT_ID=10140768157
ARTIFACT_DIGEST=sha256:361aa2f26da1cb1641b33fc2e4a638f576f12968aa0545cb80f7e1d0f765a299
ALL_REQUIRED_CHECKS=true
FAILURES=0
```

Its boundary remains technical schema/security/release acceptance. It does not establish downstream provider completion, legal-duration appropriateness, or case-specific legal outcomes.

## Public legal surfaces — current truth

The earlier critical path that treated Privacy, DPA, subprocessors/transfers and Terms as future implementation work is obsolete.

```text
PR_2031_PRIVACY=MERGED
PR_2032_DPA=MERGED
PR_2035_SUBPROCESSORS_TRANSFERS=MERGED
PR_2040_TERMS=MERGED
PR_2041_CANONICAL_RECONCILIATION=MERGED
PRIVACY_PUBLIC_VERSION=0.2-review
PRIVACY_PUBLIC_STATE=REVIEW_DRAFT_HUMAN_REVIEW_REQUIRED
TERMS_PUBLIC_VERSION=0.2-review
TERMS_PUBLIC_STATE=REVIEW_DRAFT_HUMAN_REVIEW_REQUIRED
```

The pages are deliberately review drafts. Final/effective publication remains blocked until the required facts and qualified decisions exist.

## Entity facts

```text
RISCK_COMPLY_OPERATOR_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_CONTRACTING_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_TRADE_NAME=RISCK_COMPLY
AUTHORITATIVE_REGISTRY_EVIDENCE=PENDING
ENTITY_REGISTERED_OFFICE=PENDING
ENTITY_REGISTERED_IDENTIFIERS=PENDING
ENTITY_SIGNATORY_AUTHORITY=PENDING_WHERE_REQUIRED
ENTITY_FINAL_PUBLICATION=BLOCKED
```

The owner designation supersedes `UNDECIDED` for reviewer preparation. The exact registered office, company/tax identifiers and signatory facts must still come from authoritative evidence before publication; no value is guessed here.

## Owner commercial positions

Existing attributable owner correspondence records these positions for qualified review:

| Area | Owner position | Legal state |
|---|---|---|
| Self-service cancellation | End of already-paid period | OWNER_SELECTED / COUNSEL_REVIEW_PENDING |
| General refund default | No default refund, subject to mandatory law and signed order form | OWNER_SELECTED / COUNSEL_REVIEW_PENDING |
| Post-termination export | 30-day window | OWNER_SELECTED / PRODUCT_AND_COUNSEL_REVIEW_PENDING |
| Standard uptime SLA | None unless expressly contracted | OWNER_SELECTED / COUNSEL_REVIEW_PENDING |
| Governing law | Portuguese-law preference | OWNER_SELECTED / COUNSEL_REVIEW_PENDING |

These selections reduce `OWNER_DECISION` uncertainty but do not create binding Terms. Material remaining owner/counsel decisions include liability cap/carve-outs, indemnities, breach cure/suspension mechanics, legal-notice mechanics and any positive warranty/remedy position.

## Provider factual evidence

```text
VERCEL_PRODUCTION_DEPLOYMENT=READY_SHA_13b19410
SUPABASE_PROJECT_REGION=PASS_CURRENT_EU_WEST_1
SUPABASE_DPA_PROVIDER_CONFIRMATION=DPA_INCORPORATED_IN_TERMS_FOR_CUSTOMERS_FROM_2026_08_01
SUPABASE_TRANSFER_TIA_CONCLUSION=OPEN
POSTHOG_ACCOUNT_LINKED_DPA_COMPLETION_EVIDENCE=PRESENT_FOR_OWNER_DESIGNATED_ENTITY
POSTHOG_PRODUCTION_PROJECT_BINDING=OPEN
POSTHOG_RETENTION_TRANSFER_LEGAL_INTERPRETATION=OPEN
STRIPE_LIVE_ACCOUNT_DISCOVERY=PASS
STRIPE_ACCOUNT_LEGAL_DETAIL=OPEN
PROVIDER_FACTUAL_CLOSURE=PARTIAL
```

The Supabase fact is a direct provider Privacy Team statement. The PostHog fact is an attributable PandaDoc completion notice. Neither fact independently proves all applicable transfer mechanisms, locations, retention, or qualified legal sufficiency.

## GDPR / Privacy boundary

Repository-controlled structure and technical lifecycle controls are substantially implemented. Terminal legal closure still requires, where applicable:

- authoritative controller/operator registered facts;
- final legal-basis and legitimate-interest review;
- DPO applicability decision from complete facts;
- provider recipients/transfers and retention conclusions;
- account-specific Article 14/runtime notice evidence for remaining indirect flows;
- qualified acceptance of final Privacy/DPA/transfer wording.

Therefore source completion must not be collapsed into final legal acceptance.

## Qualified human review — non-substitutable

| # | Workstream | Status |
|---:|---|---|
| 1 | LEGAL_RULES | PENDING_EXTERNAL_REVIEW |
| 2 | ARTICLE_5 | PENDING_EXTERNAL_REVIEW |
| 3 | ARTICLE_50 | PENDING_EXTERNAL_REVIEW |
| 4 | FRIA | PENDING_EXTERNAL_REVIEW |
| 5 | DEPLOYER | PENDING_EXTERNAL_REVIEW |
| 6 | HIGH_RISK_PROVIDER | PENDING_EXTERNAL_REVIEW |
| 7 | CONFORMITY | PENDING_EXTERNAL_REVIEW |
| 8 | GPAI | PENDING_EXTERNAL_REVIEW |

```text
LEGAL_8_OF_8=0/8_ACCEPTED
QUALIFIED_REVIEWS_ACCEPTED=0
CHANGES_REQUIRED=0
MASTER_LEGAL_OPINION=OPEN
```

No repository commit, AI-generated conclusion, automated review, CI result, official guidance alone, provider-support statement, synthetic identity or synthetic signature can satisfy these workstreams.

## Genuine terminal blockers

1. authoritative registered entity/seller evidence for the owner-designated company;
2. Portuguese VAT regime, registrations and supported B2B sales matrix through attributable tax/accounting authority;
3. remaining account-specific provider DPA/processing/retention/transfer facts, especially actual PostHog Production attribution if enabled;
4. remaining material Terms owner decisions and qualified enforceability/risk-allocation review;
5. final GDPR/Privacy/DPA/subprocessor/transfer qualified review;
6. eight attributable AI Act workstream decisions;
7. consolidated Master Legal Opinion/equivalent qualified conclusion;
8. deliberate final legal publication only after all required upstream gates pass.

## Current shortest path

```text
ENTITY_REGISTRY_FACTS
→ FISCAL_VAT_FACTS
→ PROVIDER_ACCOUNT_TRANSFER_FACTS
→ REMAINING_OWNER_TERMS_DECISIONS
→ QUALIFIED_GDPR_TERMS_REVIEW
→ LEGAL_8_OF_8
→ MASTER_LEGAL_OPINION
→ FINAL_PUBLICATION
```

Do not reopen already-merged Privacy/DPA/Subprocessors/Transfers/Terms implementation unless a real defect, changed fact or qualified-review request requires a delta.

## Authority boundary

```text
EMAIL_SEND_AUTHORIZED=false
PRODUCTION_DB_WRITE_AUTHORIZED=false
SYNTHETIC_LEGAL_ACCEPTANCE_FORBIDDEN=true
NO_DOCUMENTATION_LOOP=true
```