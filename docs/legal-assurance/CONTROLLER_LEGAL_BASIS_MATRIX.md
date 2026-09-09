# RISCK COMPLY — Controller-Side Legal Basis Decision Matrix

Date: 2026-09-09  
Baseline: GDPR Articles 5, 6, 9, 13 and 14.  
Status: `PRE_REVIEW_DECISION_MATRIX` — candidate bases are not final legal approval.

This matrix covers activities where RISCK COMPLY may determine its own purposes/means. Customer workspace processing on documented instructions is handled separately through the DPA/processor role matrix.

| Processing activity | Purpose | Candidate Art. 6 basis | Current state | Required decision/evidence |
|---|---|---|---|---|
| Account creation/authentication | create/manage account, authenticate user, provide contracted access | Art. 6(1)(b) contract where necessary for the user's/customer's service relationship; Art. 6(1)(f) may apply to provider-side security elements | PENDING_EXTERNAL_REVIEW | Confirm B2B user/contract nexus and split service necessity from independent security purposes |
| Workspace membership/admin metadata | administer customer account, roles and access | Art. 6(1)(b) and/or 6(1)(f) depending on relationship/activity | PENDING_EXTERNAL_REVIEW | Document necessity and employee/end-user context |
| Security/abuse/fraud prevention | protect service, tenants and infrastructure | Art. 6(1)(f) legitimate interests; Art. 6(1)(c) only where a specific legal obligation applies | PENDING_LIA | Complete legitimate-interest assessment: interest, necessity, balancing, safeguards |
| Incident response/security evidence | investigate incidents, preserve evidence, defend claims | Art. 6(1)(f), and 6(1)(c) where specific legal obligations apply | PENDING_LIA_AND_OBLIGATION_MAP | Identify concrete statutory duties and retention criteria; do not label all incident evidence as legal-obligation processing |
| Billing/subscription administration | administer contract, payments and subscription | Art. 6(1)(b); 6(1)(c) for specific accounting/tax obligations | PENDING_EXTERNAL_REVIEW | Map actual Portuguese tax/accounting obligations and separate them from contract administration |
| Support | respond to customer/user requests and operate service | Art. 6(1)(b) and/or 6(1)(f) depending on requester/context | PENDING_EXTERNAL_REVIEW | Split processor-side handling of customer content from provider-side support administration |
| Procurement/sales enquiries | respond to business enquiries, prepare/perform B2B contracting | Art. 6(1)(b) pre-contract steps where requested; Art. 6(1)(f) for B2B relationship administration where appropriate | PENDING_LIA | Define retention and direct-marketing boundary; respect ePrivacy/national rules where applicable |
| Essential service communications | security, billing, service notices necessary to operate relationship | Art. 6(1)(b), 6(1)(f), or 6(1)(c) depending on notice | PENDING_EXTERNAL_REVIEW | Classify message types and suppress marketing from essential notices |
| Optional product analytics | measure product use/improvement | Art. 6(1)(a) consent where required; 6(1)(f) only if applicable after ePrivacy/cookie analysis and balancing | BLOCKED_CONFIGURATION_AND_LEGAL_REVIEW | Confirm actual PostHog/analytics setup, identifiers, cookies/storage, consent mode and withdrawal path |
| Non-essential marketing communications | promote service/offers | consent and/or legitimate interests subject to ePrivacy/Portuguese direct-marketing rules | BLOCKED_LEGAL_RULE_MAPPING | Map Lei 41/2004/ePrivacy and recipient/context; implement opt-out/consent evidence as required |
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

## Current gate

```text
PURPOSE_INVENTORY=PASS_PARTIAL
CANDIDATE_LEGAL_BASES=MAPPED
LEGITIMATE_INTEREST_ASSESSMENTS=BLOCKED
EPRIVACY_DIRECT_MARKETING_ANALYSIS=BLOCKED
ANALYTICS_CONSENT_CONFIGURATION=BLOCKED
CONTROLLER_LEGAL_BASIS_FINAL=PENDING_EXTERNAL_REVIEW
```

The matrix closes the structural gap of having no basis-by-purpose map, but it deliberately does not turn candidate bases into final legal conclusions.