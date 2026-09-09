# RISCK COMPLY — Legal + GDPR + EU AI Act Closure Scorecard V3

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V3`

This scorecard separates canonical-main closure, verified V3 branch implementation and external assurance. Percentages are working closure estimates, not legal opinions, certifications or regulator determinations.

## Current percentages

```text
LEGAL_IMPLEMENTATION_PERCENT=84
GDPR_READINESS_PERCENT=66
AI_ACT_REGULATORY_READINESS_PERCENT=85
QUALIFIED_REVIEW_PERCENT=0
COMMERCIAL_LEGAL_PERCENT=45

CANONICAL_MAIN_INTERNAL_CLOSURE_PERCENT=75
V3_WORKING_INTERNAL_CONTROLLABLE_CLOSURE_PERCENT=77
V3_WORKING_INTERNAL_CONTROLLABLE_REMAINING_PERCENT=23
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=49
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=51
```

### Interpretation

- `CANONICAL_MAIN_INTERNAL_CLOSURE_PERCENT=75` reflects PR #2008 merged into canonical `main` SHA `0cda9253985170a5f56821023a77c81cdc54037a`.
- `V3_WORKING_INTERNAL_CONTROLLABLE_CLOSURE_PERCENT=77` adds V3 changes that are committed to the closure branch but not yet merged/credited as canonical.
- `TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=49` remains lower because qualified external assurance is still 0/8 and entity/provider/legal-judgment blockers remain.

## V3 gates changed

| Gate | Previous | V3 state | Evidence / boundary |
|---|---|---|---|
| PORTUGUESE_FISCAL_ACCOUNTING_RETENTION | BLOCKED_LEGAL_PERIOD | PASS_10_YEARS | Portuguese Tax Authority CIVA Art. 52 and CIRC Art. 123; applies only to covered fiscal/accounting records, not all personal data |
| ARTICLE13_2E_DATA_PROVISION | BLOCKED | PASS_PRE_PUBLICATION | factual mandatory/optional/conditional field and non-provision consequences mapped from auth/onboarding/Stripe Checkout implementation |
| ARTICLE14_SCENARIO_TIMING | NOT_TESTED | PASS_STRUCTURE | Article 14(3) one-month/first-communication/first-disclosure routing mapped from official GDPR text |
| ARTICLE14_INVITATION_FIRST_COMMUNICATION | NOT_TESTED | PASS_IMPLEMENTED_PRE_MERGE | first invitation email now discloses source/purpose/non-acceptance consequence and locale Privacy link; email sender has delivery log model |
| ARTICLE14_EXCEPTION_DISCIPLINE | NOT_TESTED | PASS_STRUCTURE_NO_EXCEPTION_ASSUMED | no blanket exception; concrete exception record required |
| RETENTION_SCHEDULE | BLOCKED | PARTIAL_NOT_FINAL | fiscal/accounting period closed; account/support/security/log/provider backup periods remain open |
| PRIVACY_ART13_14_MAPPING | BLOCKED | BLOCKED_FINAL_FACTS_PUBLICATION_AND_REVIEW | internal mapping improved; public Privacy page still incomplete and entity/provider/legal-basis facts remain |

## Unchanged hard blockers

```text
REGISTERED_OFFICE=BLOCKED_OFFICIAL_REGISTRY_CONFIRMATION
NIF_NIPC=BLOCKED_AUTHORITATIVE_CONFIRMATION
PROVIDER_ACCOUNT_TRANSFER_EVIDENCE=BLOCKED_PARTIAL
DPO_REQUIRED=UNCERTAIN_FACTS
DPIA_REQUIRED=UNCERTAIN_FACTS
DATA_SUBJECT_RIGHTS=PARTIAL_ISSUE_2009
PUBLIC_PRIVACY_ART13_14_COMPLETENESS=FAIL
DPA_FINAL=BLOCKED
TERMS_FINAL=BLOCKED
QUALIFIED_AI_ACT_REVIEWS=0/8_ACCEPTED
LEGAL_FINAL=BLOCKED
ENTERPRISE_100=NO
```

## Highest-value next internal closures

1. implement canonical GDPR rights-request register / deadline workflow from issue #2009;
2. bind complete Privacy information to auth, Checkout and remaining controller-side indirect-data flows after final factual content is approved;
3. complete LIAs for controller-side Art. 6(1)(f) candidates;
4. reconcile active providers with account-specific DPA/transfer/retention evidence;
5. choose factual owner-controlled account/support/security retention criteria that do not require legal invention;
6. keep public claims fail-closed until the public notice is complete.

## External assurance boundary

Eight qualified AI Act review tracks remain **0/8 accepted**. No CI result, internal matrix, AI-generated review or code implementation changes that external acceptance count.