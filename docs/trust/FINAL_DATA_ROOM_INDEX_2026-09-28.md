# RISCK COMPLY — Canonical Buyer Data Room Index

Version: 2026-09-28  
Status: `BUYER_DATA_ROOM_INTERNAL_100 / EXTERNAL_ASSURANCE_SEPARATE`  
Repository baseline reconciled: `main@0fdec34b19b200aaab44e8f5495aebe8a6b77d6c`  
Classification: `CONTROLLED_INDEX / PUBLIC_REPOSITORY_SAFE`

This index supersedes `FINAL_DATA_ROOM_INDEX_2026-09-24.md` for current documentation routing. Historical evidence remains historical and must not be rewritten as current release proof.

## 1. Master inventory and disclosure truth

Start with:

- `docs/trust/BUYER_DATA_ROOM_100_MASTER_INVENTORY_2026-09-28.md`
- `docs/trust/UNIVERSAL_BUYER_READINESS_2026-09-24.md`
- `docs/evidence/EXTERNAL_ASSURANCE_LEGAL_FINAL_SCORECARD.md`
- `docs/trust/TRUST_SIGNAL_REGISTER.md`

The master inventory closes the internal documentation-response capability. External assurance, legal approval, production parity, buyer acceptance and signed contracts remain separate states.

## 2. Product / commercial

- `docs/sales/one-pager.md`
- `docs/sales/pitch-deck-short.md`
- `docs/sales/demo-script-10-min.md`
- `docs/sales/commercial-faq.md`
- `docs/sales/enterprise-onboarding-plan.md`
- `config/billing-commercial-catalog.json`
- `docs/enterprise/ENTERPRISE_PRICING_AND_BILLING_ARCHITECTURE.md`

## 3. Architecture / technical

- `docs/trust/ARCHITECTURE_OVERVIEW.md`
- `docs/trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md`
- `docs/trust/ACCESS_CONTROL.md`
- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/security/`
- `supabase/migrations/`

Release-specific runtime claims must cite the release/environment evidence that actually proves them.

## 4. Security / assurance

- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/trust/BACKUP_AND_RECOVERY.md`
- `docs/trust/DISASTER_RECOVERY_TEST_PLAN.md`
- `docs/trust/PENTEST_READINESS.md`
- `docs/trust/ISO27001_SOC2_READINESS.md`
- `docs/trust/TRUST_SIGNAL_REGISTER.md`
- `docs/evidence/EXTERNAL_ASSURANCE_LEGAL_FINAL_SCORECARD.md`
- `docs/trust/CAIQ_V4_1_BUYER_RESPONSE_POSITION_2026-09-28.md`

Current disclosure boundary: an attributable external black-box assessment/report exists, technical remediation evidence exists for the original TLS findings, but a clean independent terminal retest/manual pentest is not claimed unless separately evidenced.

## 5. Privacy / GDPR / legal review material

- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/DPA_DRAFT.md`
- `docs/trust/RETENTION_POLICY_DRAFT.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/legal-assurance/ROPA.md`
- `docs/legal-assurance/PRIVACY_ART13_14_MATRIX.md`
- `docs/legal-assurance/DPA_ARTICLE_28_CONTROL_MATRIX.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/legal-assurance/CURRENT_LEGAL_AUTHORITY.md`
- `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`

Draft/review materials are not represented as signed contracts or qualified external legal approval.

## 6. AI Act / AI governance

- `docs/legal-assurance/CURRENT_LEGAL_AUTHORITY.md`
- `docs/legal-assurance/LEGAL_APPLICABILITY_MATRIX_V2_2026-09-14.md`
- `docs/compliance/`
- current assessment/FRIA/governance/transparency evidence

Product documentation supports customer governance workflows. It is not a regulator certification or guarantee of a customer's compliance.

## 7. Procurement / questionnaires / FAQs

- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- `docs/trust/PROCUREMENT_CHECKLIST.md`
- `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`
- `docs/trust/SECURITY_QUESTIONNAIRE_OPERATING_GUIDE.md`
- `docs/trust/ENTERPRISE_BUYER_DUE_DILIGENCE_QA.md`
- `docs/trust/SECURITY_FAQ.md`
- `docs/trust/CAIQ_V4_1_BUYER_RESPONSE_POSITION_2026-09-28.md`
- Trust Center procurement/questionnaire endpoints

Buyer-specific questionnaires must be answered from canonical evidence and use `UNKNOWN / FACT_REQUIRED` when an account/provider fact cannot be proven.

## 8. Providers / subprocessors

- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`
- `docs/trust/SUBPROCESSORS.md`

The provider register is the factual source for Vercel, Supabase, Stripe, Sentry, Google, PostHog, Resend and other applicable services. It deliberately preserves unresolved account/legal/retention/transfer facts rather than guessing.

## 9. Billing

- `docs/enterprise/ENTERPRISE_PRICING_AND_BILLING_ARCHITECTURE.md`
- `config/billing-commercial-catalog.json`
- server-side billing/entitlement routes and controls
- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`

Stripe's role must not be converted into a claim that RISCK COMPLY itself is PCI certified. Synthetic/test billing evidence must not be represented as customers or revenue.

## 10. M&A / strategic buyer

- `docs/trust/M_AND_A_IP_SOFTWARE_DILIGENCE_INDEX.md`
- `docs/trust/OPEN_SOURCE_LICENSE_DILIGENCE_2026-09-24.md`
- `docs/trust/BUYER_FIRST_48_HOURS_HANDOFF.md`
- current SBOM/supply-chain evidence
- exact-SHA CI/release evidence
- repository governance evidence

Raw source code, exploit detail, credentials, customer records, privileged advice and sensitive provider configuration are not automatically part of the initial pack.

## 11. Buyer packages

| Buyer | Canonical package |
| --- | --- |
| SMB | `SMB_INITIAL_PACK` in `UNIVERSAL_BUYER_READINESS_2026-09-24.md` |
| Mid-market | `MID_MARKET_INITIAL_PACK` |
| Enterprise | `ENTERPRISE_INITIAL_PACK` |
| Regulated | Enterprise pack + relevant legal/privacy/security evidence under controlled disclosure |
| Big Tech / M&A | `BIG_TECH_MA_INITIAL_PACK` + M&A/IP/software diligence index |

These packs reference canonical material; they do not duplicate policy documents.

## 12. Confidentiality levels

- `PUBLIC`
- `INITIAL_SHARE`
- `NDA_REQUIRED`
- `DILIGENCE_ONLY`
- `HIGHLY_CONFIDENTIAL`
- `INTERNAL_ONLY`

Share the minimum relevant evidence for the identified buyer and purpose.

## 13. Current documentation closure

```text
DOCUMENT_REQUIREMENT_CAPABILITIES_TOTAL=175
DOCUMENTATION_CAPABILITIES_ANSWERABLE=175
MANDATORY_INTERNAL_DOCUMENT_BLOCKERS=0
BUYER_DATA_ROOM_INTERNAL_PERCENT=100
SMB_READY_INTERNAL_DOCUMENTATION=YES
MID_MARKET_READY_INTERNAL_DOCUMENTATION=YES
ENTERPRISE_BUYER_READY_INTERNAL_DOCUMENTATION=YES
BIG_TECH_DILIGENCE_READY_INTERNAL_INDEX=YES
M_AND_A_DATA_ROOM_READY_INTERNAL_INDEX=YES
```

## 14. Remaining external/non-document dependencies

- buyer/counterparty acceptance and signed contracts;
- buyer-specific questionnaire negotiation and SAML/IdP configuration;
- clean independent retest/manual pentest where requested;
- qualified counsel approval where required;
- ISO 27001 / SOC 2 unless later actually obtained;
- standard cloud-security CAIQ v4.1 completion/listing unless later actually completed;
- authoritative provider/account facts not currently available;
- authoritative registry/tax evidence when requested;
- transaction-specific legal/IP validation where requested;
- exact production/release acceptance owned by the engineering/release lane.

None of these may be silently converted to PASS by documentation alone.

## 15. Stop condition

```text
DOCUMENTATION_MASTER_STOP_CONDITION=PASS
REOPEN_ONLY_ON_MATERIAL_CHANGE_OR_GENUINELY_NEW_BUYER_REQUIREMENT=YES
```
