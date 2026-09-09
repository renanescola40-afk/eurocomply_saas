# RISCK COMPLY — Controller-Side Legal Basis Decision Matrix

Date: 2026-09-09  
Baseline: GDPR Articles 5, 6, 9, 13 and 14.  
Status: `PRE_REVIEW_DECISION_MATRIX` — candidate bases are not final legal approval.

This matrix covers activities where RISCK COMPLY may determine its own purposes/means. Customer workspace processing on documented instructions is handled separately through the DPA/processor role matrix.

| Processing activity | Purpose | Candidate Art. 6 basis | Current state | Required decision/evidence |
|---|---|---|---|---|
| Account creation/authentication | create/manage account, authenticate user, provide contracted access | Art. 6(1)(b) contract where necessary for the user's/customer's service relationship; Art. 6(1)(f) may apply to provider-side security elements | PENDING_EXTERNAL_REVIEW | Confirm B2B user/contract nexus and split service necessity from independent security purposes |
| Workspace membership/admin metadata | administer customer account, roles and access | Art. 6(1)(b) and/or 6(1)(f) depending on relationship/activity | PENDING_EXTERNAL_REVIEW | Document necessity and employee/end-user context |
| Security/abuse/fraud prevention | protect service, tenants and infrastructure | Art. 6(1)(f) legitimate interests; Art. 6(1)(c) only where a specific legal obligation applies | PASS_LIA_PRE_REVIEW | `LEGITIMATE_INTEREST_ASSESSMENTS.md` LIA-SEC-01 completes interest/necessity/balancing/safeguards; final basis remains external-review dependent |
| Incident response/security evidence | investigate incidents, preserve evidence, defend claims | Art. 6(1)(f), and 6(1)(c) where specific legal obligations apply | PASS_LIA_PRE_REVIEW_WITH_RETENTION_DEPENDENCY | LIA-INC-01 completed; identify concrete statutory duties case-by-case and close retention criterion |
| Billing/subscription administration | administer contract, payments and subscription | Art. 6(1)(b); 6(1)(c) for specific accounting/tax obligations | PENDING_EXTERNAL_REVIEW | Portuguese fiscal/accounting 10-year archive is mapped for covered records; final split between contract administration and legal obligation remains under review |
| Support | respond to customer/user requests and operate service | Art. 6(1)(b) and/or 6(1)(f) depending on requester/context | PENDING_EXTERNAL_REVIEW | Split processor-side handling of customer content from provider-side support administration |
| Procurement/sales enquiries | respond to business enquiries, prepare/perform B2B contracting | Art. 6(1)(b) pre-contract steps where requested; Art. 6(1)(f) for narrow B2B relationship administration where appropriate | PASS_LIA_PRE_REVIEW_RELATIONSHIP_ADMIN | LIA-B2B-01 covers narrow relationship/procurement administration; direct marketing/ePrivacy remains explicitly outside positive LIA credit |
| Essential service communications | security, billing, service notices necessary to operate relationship | Art. 6(1)(b), 6(1)(f), or 6(1)(c) depending on notice | PENDING_EXTERNAL_REVIEW | Classify message types and suppress marketing from essential notices |
| Optional product analytics | measure product use/improvement | Art. 6(1)(a) consent where required; 6(1)(f) only if applicable after ePrivacy/cookie analysis and balancing | PASS_SOURCE_CONSENT_FAIL_CLOSED_PRE_REVIEW | Source defaults consent requirement to enabled unless explicitly disabled, blocks PostHog loading/capture without stored grant, exposes allow/decline and later withdrawal controls, stops recording/opts out on withdrawal. Retain exact Production configuration/runtime evidence and obtain final ePrivacy/legal-basis review |
| Non-essential marketing communications | promote service/offers | GDPR basis must be assessed together with the more specific Portuguese electronic-marketing rules; an Art. 6(1)(f) LIA alone does not authorize sending | PASS_RULE_MAPPING_IMPLEMENTATION_BLOCKED | `EPRIVACY_DIRECT_MARKETING_PORTUGAL.md` maps Lei 41/2004 Arts. 13-A/13-B: natural-person prior express-consent rule, legal-person objection/DGC-list route, qualifying existing-customer similar-service route, sender identity/termination contact; implement consent/suppression/DGC evidence and send-time enforcement before runtime credit |
| Corporate/legal recordkeeping | establish, exercise or defend legal claims; compliance records | Art. 6(1)(f) and/or 6(1)(c) when a specific obligation applies | PENDING_EXTERNAL_REVIEW | Tie every retained class to an actual purpose, rule or claims rationale |

## Article 9 / special-category boundary

No controller-side Art. 9 condition is selected by default. The DPA draft states special-category/criminal data should not be accepted as normal customer content unless expressly approved with additional safeguards. If RISCK COMPLY itself determines purposes for any Article 9 processing, the specific Article 9 condition must be identified separately; Article 6 alone is insufficient.

## Legitimate-interest assessment contract

Any row relying on Art. 6(1)(f) must record:

1. precise legitimate interest;
2. necessity / less-intrusive alternatives;
3. balancing against the individual's interests, rights and reasonable expectations;
4. data minimisation and security safeguards;
5. objection handling where applicable;
6. retention criteria;
7. date/owner/version and material-change review trigger.

The current LIA pack completes this structure for security/abuse prevention, incident response/security evidence and narrow B2B relationship/procurement administration. It deliberately does not approve optional analytics under legitimate interests or non-essential direct marketing.

## Analytics consent source boundary

The previous `BLOCKED_CONFIGURATION` label was too broad for the current source state.

Canonical source now provides all of the following controls:

- `isAnalyticsConsentRequired()` fails closed: consent is required unless `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT` is explicitly `false`;
- PostHog initialization returns without loading when consent is required and no stored grant exists;
- event capture, identity, organization grouping and feature-flag access are gated by the same consent state;
- the consent banner provides allow/decline choices and links to the Cookie Policy;
- Cookie Policy rendering exposes persistent `AnalyticsConsentControls` allowing a later grant, decline or withdrawal;
- withdrawal stores `denied`, stops session recording and invokes PostHog opt-out;
- source configuration disables session recording by default and masks text/attributes;
- tests cover fail-closed consent behavior and public consent controls.

That is sufficient for **source-control PASS**, not for final legal basis or exact Production runtime acceptance.

```text
ANALYTICS_CONSENT_SOURCE_CONTROL=PASS
ANALYTICS_CONSENT_FAIL_CLOSED_DEFAULT=PASS
ANALYTICS_CONSENT_WITHDRAWAL_UI=PASS_SOURCE_IMPLEMENTED
ANALYTICS_CAPTURE_GATING=PASS_SOURCE_IMPLEMENTED
ANALYTICS_PRODUCTION_EXACT_CONFIG=OPEN_RUNTIME_EVIDENCE
ANALYTICS_EPRIVACY_LEGAL_BASIS=PENDING_EXTERNAL_REVIEW
```

Production must still prove the exact deployed build/configuration and current provider/account facts. The source control must not be used to claim that the final ePrivacy/GDPR legal basis has been accepted.

## Direct-marketing rule separation

`EPRIVACY_DIRECT_MARKETING_PORTUGAL.md` closes the prior rule-mapping gap for Portuguese unsolicited electronic marketing without granting runtime readiness. In particular:

```text
GDPR_LIA != EPRIVACY_PERMISSION_TO_SEND
B2B_CONTACT != AUTOMATIC_LEGAL_PERSON_CLASSIFICATION
EXISTING_CUSTOMER != AUTOMATIC_SOFT_OPT_IN
OPT_OUT_LINK != SUBSTITUTE_FOR_REQUIRED_PRIOR_CONSENT
```

Consent provenance, suppression/objection enforcement, qualifying existing-customer evidence, DGC-list handling where applicable, sender identity and valid termination contact remain implementation/evidence gates.

## Current gate

```text
PURPOSE_INVENTORY=PASS_PARTIAL
CANDIDATE_LEGAL_BASES=MAPPED
LEGITIMATE_INTEREST_ASSESSMENTS=PASS_PRE_REVIEW_PARTIAL_SCOPE
SECURITY_ABUSE_LIA=PASS_PRE_REVIEW
INCIDENT_RESPONSE_LIA=PASS_PRE_REVIEW_WITH_RETENTION_DEPENDENCY
B2B_RELATIONSHIP_ADMIN_LIA=PASS_PRE_REVIEW
ANALYTICS_CONSENT_SOURCE_CONTROL=PASS
ANALYTICS_CONSENT_WITHDRAWAL_UI=PASS_SOURCE_IMPLEMENTED
ANALYTICS_PRODUCTION_EXACT_CONFIG=OPEN_RUNTIME_EVIDENCE
ANALYTICS_EPRIVACY_LEGAL_BASIS=PENDING_EXTERNAL_REVIEW
EPRIVACY_DIRECT_MARKETING_ANALYSIS=PASS_RULE_MAPPING_IMPLEMENTATION_BLOCKED
DIRECT_MARKETING_RUNTIME_READY=NO
CONTROLLER_LEGAL_BASIS_FINAL=PENDING_EXTERNAL_REVIEW
```

The matrix closes the stale analytics source-configuration blocker while preserving exact Production evidence, ePrivacy/legal-basis review, direct-marketing implementation and external-review blockers.