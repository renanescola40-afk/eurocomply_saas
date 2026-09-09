# RISCK COMPLY — Legal + GDPR + EU AI Act Closure Scorecard V4

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V4`

This scorecard reconciles the canonical state after merged PRs #2008 and #2011 and records the V4 Article 14 origin-hardening correction plus the completed pre-review legitimate-interest assessment pack. Percentages are working closure estimates, not legal opinions, certifications or regulator determinations.

## Current percentages

```text
LEGAL_IMPLEMENTATION_PERCENT=86
GDPR_READINESS_PERCENT=68
AI_ACT_REGULATORY_READINESS_PERCENT=85
QUALIFIED_REVIEW_PERCENT=0
COMMERCIAL_LEGAL_PERCENT=45

CANONICAL_MAIN_INTERNAL_CLOSURE_PERCENT=77
CANONICAL_MAIN_INTERNAL_REMAINING_PERCENT=23
V4_WORKING_INTERNAL_CONTROLLABLE_CLOSURE_PERCENT=79
V4_WORKING_INTERNAL_CONTROLLABLE_REMAINING_PERCENT=21
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=50
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=50
```

The V4 increase from 77 to 79 working internal closure is credited to a substantive gate change: the highest-value controller-side Article 6(1)(f) candidates now have explicit interest/necessity/balancing/safeguard assessments instead of a blanket `BLOCKED_LIA` state. The Article 14 origin hardening itself receives no percentage credit because it corrects an already-credited control.

## Canonical closures now credited

| Gate | Canonical state | Evidence / boundary |
|---|---|---|
| GDPR_V2_CONTROL_MAPS | PASS_CANONICAL | PR #2008 merged; data roles, Art. 13/14 matrix, Art. 28, transfers, TOMs, breach, rights, DPO/DPIA screening, RoPA, retention structure |
| PORTUGUESE_FISCAL_ACCOUNTING_RETENTION | PASS_10_YEARS | PR #2011 merged; Portuguese Tax Authority CIVA Art. 52 and CIRC Art. 123, narrowly scoped to covered fiscal/accounting records |
| ARTICLE13_2E_DATA_PROVISION | PASS_PRE_PUBLICATION_CANONICAL | PR #2011 merged; factual mandatory/optional/conditional data-provision and non-provision consequences mapped |
| ARTICLE14_SCENARIO_TIMING | PASS_STRUCTURE_CANONICAL | PR #2011 merged; timing/role/exception discipline mapped |
| ARTICLE14_INVITATION_FIRST_COMMUNICATION | PASS_MERGED_CANONICAL | first invitation communication now contains source/purpose/non-acceptance/privacy-link disclosure |

## V4 working gates

| Gate | Previous | V4 state | Boundary |
|---|---|---|---|
| ARTICLE14_PRIVACY_LINK_ORIGIN_HARDENING | unsafe origin model narrower than documentation claim | PASS_IMPLEMENTED_PRE_MERGE_V4 | absolute Privacy origin restricted to RISCK COMPLY HTTPS domains / localhost dev; regression coverage added |
| SECURITY_ABUSE_LIA | BLOCKED | PASS_PRE_REVIEW | precise interest, necessity, balancing, safeguards and review triggers documented; final legal basis still external-review dependent |
| INCIDENT_RESPONSE_LIA | BLOCKED | PASS_PRE_REVIEW_WITH_RETENTION_DEPENDENCY | LIA completed; statutory-obligation and retention decisions remain case-specific/open |
| B2B_RELATIONSHIP_ADMIN_LIA | BLOCKED | PASS_PRE_REVIEW | narrow procurement/relationship administration assessed; direct marketing explicitly excluded from positive credit |
| LEGITIMATE_INTEREST_ASSESSMENTS | BLOCKED | PASS_PRE_REVIEW_PARTIAL_SCOPE | analytics/direct marketing remain blocked by configuration/ePrivacy rather than being silently approved |

## Hard blockers unchanged

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

1. close the canonical GDPR rights-request register/deadline workflow under issue #2009;
2. reconcile provider-account DPA/transfer/retention facts;
3. bind complete Privacy information to authentication, Checkout and remaining controller-side indirect collection surfaces;
4. map Portuguese/ePrivacy direct-marketing rules before any non-essential marketing basis is credited;
5. choose defensible owner-controlled account/support/security retention criteria where this can be done factually without inventing legal conclusions;
6. keep public claims fail-closed until the public Privacy notice and final legal texts are complete.

## External assurance boundary

Eight qualified AI Act review tracks remain **0/8 accepted**. No CI result, internal matrix, AI-generated review or code implementation changes that external acceptance count.