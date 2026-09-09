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
| Optional product analytics | measure product use/improvement | Art. 6(1)(a) consent where required; 6(1)(f) only if applicable after ePrivacy/cookie analysis and balancing | BLOCKED_CONFIGURATION_AND_LEGAL_REVIEW | Confirm actual PostHog/analytics setup, identifiers, cookies/storage, consent mode and withdrawal path |
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

The current LIA pack completes this structure for security/abuse prevention, incident response/security evidence and narrow B2B relationship/procurement administration. It deliberately does not approve optional analytics or non-essential direct marketing.

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
EPRIVACY_DIRECT_MARKETING_ANALYSIS=PASS_RULE_MAPPING_IMPLEMENTATION_BLOCKED
DIRECT_MARKETING_RUNTIME_READY=NO
ANALYTICS_CONSENT_CONFIGURATION=BLOCKED
CONTROLLER_LEGAL_BASIS_FINAL=PENDING_EXTERNAL_REVIEW
```

The matrix closes the internal structural LIA and Portuguese electronic-marketing rule-mapping gaps while preserving the implementation, configuration and external-review blockers.