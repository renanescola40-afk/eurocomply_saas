# RISCK COMPLY — Legal + GDPR + EU AI Act Regulatory Closure Status

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V3`

## Terminal truth

```text
AI_IMPLEMENTATION=100_PERCENT_ON_CANONICAL_MAIN
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEW_STAGE_REMAINING=100_PERCENT
LEGAL_RULES_REVIEW=PENDING_EXTERNAL_REVIEW
ARTICLE_5_REVIEW=PENDING_EXTERNAL_REVIEW
ARTICLE_50_REVIEW=PENDING_EXTERNAL_REVIEW
FRIA_REVIEW=PENDING_EXTERNAL_REVIEW
DEPLOYER_OBLIGATIONS_REVIEW=PENDING_EXTERNAL_REVIEW
HIGH_RISK_PROVIDER_REVIEW=PENDING_EXTERNAL_REVIEW
CONFORMITY_REVIEW=PENDING_EXTERNAL_REVIEW
GPAI_REVIEW=PENDING_EXTERNAL_REVIEW
PR_2008=MERGED
CANONICAL_MAIN_SHA=0cda9253985170a5f56821023a77c81cdc54037a
PR_2011=OPEN_V3_VALIDATION
V3_EXACT_HEAD=SEE_PR_2011_CURRENT_HEAD
CANONICAL_MAIN_INTERNAL_CLOSURE_PERCENT=75
V3_WORKING_INTERNAL_CLOSURE_PERCENT=77
V3_WORKING_INTERNAL_REMAINING_PERCENT=23
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=49
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=51
TERMS_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
PRIVACY_FINAL=BLOCKED_FOUNDER_PROVIDER_PUBLICATION_AND_LEGAL_BASIS_DECISIONS
DPA_FINAL=BLOCKED_FOUNDER_PROVIDER_AND_CONTRACT_DECISIONS
SUBPROCESSORS_FINAL=BLOCKED_PROVIDER_CONTRACT_AND_TRANSFER_FACTS
LEGAL_FINAL=BLOCKED
ENTERPRISE_100=NO
```

`V3_EXACT_HEAD` is intentionally resolved from PR #2011 / GitHub at validation time instead of being hard-coded in this file. Hard-coding the branch head here is self-referential because updating this status file creates a new head commit.

No software check, AI-generated opinion, CI result, internal self-review or synthetic signature can change a qualified external workstream to `PASS`.

## Canonical state after V2

PR #2008 merged on 2026-09-09 at 12:41:11 UTC. Canonical `main` is:

`0cda9253985170a5f56821023a77c81cdc54037a`

This supersedes the older closure-status SHA and makes the V2 GDPR/AI Act matrices canonical repository evidence.

## V3 work in PR #2011

V3 continues only repository/official-source work that can be truthfully closed without pretending external approval exists.

### Portuguese fiscal/accounting retention

The current Portuguese Tax Authority sources now close the period for the categories actually covered by the statutory archive:

```text
PORTUGUESE_FISCAL_ACCOUNTING_RETENTION=PASS_10_YEARS
```

- CIVA Article 52: 10 subsequent civil years for covered VAT records/supporting documents, with its specific counting rules where applicable.
- CIRC Article 123(4): 10 years for accounting books/records and supporting documents.

This does not create a blanket 10-year period for account profiles, customer workspace content, support tickets, analytics or operational/security logs.

### Article 13(2)(e)

Current auth, onboarding and Stripe Checkout implementation has been mapped field-by-field in `DATA_PROVISION_REQUIREMENT_MATRIX.md`.

```text
ARTICLE13_2E_FACT_INVENTORY=PASS
MANDATORY_OPTIONAL_DISTINCTION=PASS
CONSEQUENCE_OF_NON_PROVISION=PASS_FACTUAL_MAPPING
PUBLIC_ART13_2E_DISCLOSURE=PENDING_PRIVACY_RECONCILIATION
```

Product-required, contractual/checkout-required, optional and conditional information remain explicitly distinct from statutory obligations.

### Article 14 indirect collection

`ARTICLE14_INDIRECT_COLLECTION_REGISTER.md` now maps known controller/processor/mixed scenarios and the Article 14(3) timing states:

```text
NOTICE_BEFORE_OR_AT_FIRST_COMMUNICATION
NOTICE_WITHIN_ONE_MONTH
NOTICE_BEFORE_FIRST_DISCLOSURE
ARTICLE14_5_EXCEPTION_DOCUMENTED
NOT_APPLICABLE_PROCESSOR_ONLY
BLOCKED_ROLE_OR_FACTS
```

No blanket Article 14(5) exception is approved.

The clearest runtime case — teammate invitation email provided by an organisation administrator — is implemented in V3 so the first invitation communication states the source, invitation purpose, consequence of non-acceptance and a locale Privacy link. The canonical email sender already supports delivery evidence with status/provider/idempotency/sent timestamp.

```text
ARTICLE14_INVITATION_FIRST_COMMUNICATION_PATH=PASS_IMPLEMENTED_PRE_MERGE
ARTICLE14_INVITATION_DELIVERY_EVIDENCE_MODEL=PASS_IMPLEMENTED
ARTICLE14_RUNTIME_DELIVERY=PARTIAL
```

Full Article 14 remains partial because the linked public Privacy content is not yet a complete final Articles 13/14 notice and other controller-side indirect flows still require binding evidence.

## Founder/company identity — fail closed

Current usable review facts remain:

- brand/product: `RISCK COMPLY`;
- review-draft contracting entity: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`;
- website: `https://www.risckcomply.com`;
- verified reachable corporate intake mailbox: `comercial@risckcomply.com`;
- owner-supplied correspondence/operating address: `Avenida de Roma 112-A, 1700-353 Lisboa, Portugal`.

Still blocked:

```text
REGISTERED_OFFICE=BLOCKED_OFFICIAL_REGISTRY_CONFIRMATION
NIF_NIPC=BLOCKED_AUTHORITATIVE_CONFIRMATION_DUE_TO_CONFLICT
```

No NIF/NIPC or registered office is selected by inference.

## Privacy truth boundary

The public `/[locale]/privacy` route remains a concise Trust Center summary and is not, by itself, a complete GDPR Articles 13/14 information notice.

V3 materially improves the internal mapping, including:

- Article 13(2)(e) mandatory/optional/consequence facts;
- Portuguese fiscal/accounting retention period where genuinely applicable;
- Article 14 source/timing/exception workflow;
- first-communication disclosure in teammate invitations.

The remaining Privacy blockers are primarily legal-entity facts, final legal-basis/LIA decisions, provider recipients/transfers, non-fiscal retention/provider cycles, DPO/DPIA facts where applicable, rights-workflow issue #2009 and final public notice reconciliation.

## DPA/provider truth boundary

The DPA remains a strong review draft but not final. Open gates include authoritative entity facts, subprocessor authorisation/notice mechanics, actual provider account terms, transfer mechanisms, customer-specific annex details, deletion/export windows and final contractual allocation.

Provider region or account existence is not treated as proof of a Chapter V mechanism.

## Data-subject rights

Export and delete-request intake remain strong, but full Chapter III operations are still partial.

```text
DATA_SUBJECT_RIGHTS=PARTIAL
CANONICAL_RIGHTS_REQUEST_REGISTER=OPEN_ISSUE_2009
DEADLINE_TRACKING=BLOCKED_RUNTIME
RESTRICTION=NOT_TESTED_RUNTIME
OBJECTION=NOT_TESTED_RUNTIME
```

Issue #2009 remains the primary repository-controlled GDPR rights big rock.

## Qualified review model

Eight canonical AI Act review tracks remain prepared but not accepted:

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

A workstream closes only with attributable reviewer identity, qualification/expertise, scope, independence/conflict position, reviewed version/SHA where relevant, date, findings, limitations and disposition.

## Current critical path

1. finish CI for PR #2011 and correct any real failures;
2. merge V3 only through the protected repository process when required checks/authorization conditions are satisfied;
3. implement issue #2009 canonical rights-request/deadline workflow;
4. reconcile active Production providers, account terms, DPAs, regions/access and transfer mechanisms;
5. complete controller-side LIAs where Art. 6(1)(f) is retained as candidate basis;
6. close remaining non-fiscal retention criteria and provider backup/log facts;
7. obtain authoritative Portuguese registry evidence for registered office and NIF/NIPC;
8. reconcile the final public Privacy notice only after factual/legal inputs are approved;
9. complete the 8 genuinely external qualified review tracks;
10. only then promote `LEGAL_FINAL` / `ENTERPRISE_100` to PASS.

## External communication boundary

```text
EMAIL_SEND_AUTHORIZED=false
```

No reviewer/lawyer/regulator outreach is sent by this lane without explicit owner authorization.