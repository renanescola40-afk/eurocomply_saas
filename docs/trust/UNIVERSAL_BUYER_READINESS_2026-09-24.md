# RISCK COMPLY — Universal Buyer Readiness Terminal Index

Date: 2026-09-24  
Release truth: `3599ad36e8549474021a669e0f1ad427421df4b7`  
Scope: SMB, mid-market, enterprise and strategic-acquirer/M&A diligence.  
Status: `INTERNAL_CANONICAL_SHARE_POLICY`

This index does not create certifications, customers, revenue, buyer interest, insurance, legal approval, clean pentest results or signed contracts. Runtime claims remain exact-release evidence-bound.

## Share-set policy

| Level | Canonical initial set | Sharing rule | External/buyer-specific boundary |
| --- | --- | --- | --- |
| SMB | one-pager, demo, pricing, Terms review surface, Privacy review surface, DPA where applicable, onboarding, support contact, basic security summary, AI Act scope summary | Initial share; keep short and non-technical | signed terms/DPA, buyer acceptance |
| Mid-market | SMB set + security overview/questionnaire, architecture overview, subprocessors, transfer/data-residency summary, retention/deletion, incident response, procurement pack/checklist, BCP summary, audit-log and SSO/MFA summaries | Initial share; NDA for controlled evidence | buyer questionnaire, negotiated schedules |
| Enterprise | Mid-market set + architecture diagram, RLS/RBAC/tenant-isolation evidence, audit export/hash-chain evidence, backup/DR evidence, SAML/MFA runtime status, ROPA, Art. 13/14 + Art. 28 matrices, AI Act/GDPR indexes, SBOM/supply-chain evidence | NDA for detailed technical evidence; diligence-only for raw evidence | IdP config, clean external retest, certification/audit, measured provider RTO/RPO |
| Big Tech / M&A | Enterprise set + canonical data-room index, buyer Q&A, first-48-hours handoff, source/repository/architecture/dependency/IP asset indexes, known risks/external dependencies, exact-SHA/CI evidence and disclosure rules | Initial pack is intentionally high-level; source/raw evidence only in late-stage controlled diligence | buyer acceptance, transaction terms, qualified legal conclusions |

## Four canonical initial packs

### SMB_INITIAL_PACK
- `docs/sales/one-pager.md`
- `docs/sales/demo-script-10-min.md`
- `config/billing-commercial-catalog.json`
- public Terms/Privacy review surfaces
- `docs/trust/DPA_DRAFT.md` where applicable
- `docs/sales/enterprise-onboarding-plan.md`
- `docs/trust/SECURITY_OVERVIEW.md`
- current AI Act scope summary

### MID_MARKET_INITIAL_PACK
Everything in SMB plus:
- `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`
- `docs/trust/ARCHITECTURE_OVERVIEW.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- `docs/trust/PROCUREMENT_CHECKLIST.md`

### ENTERPRISE_INITIAL_PACK
Everything in Mid-market plus:
- `docs/trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md`
- current controlled tenant-isolation evidence
- audit evidence-pack/hash-chain evidence
- backup/DR evidence
- SSO/MFA status
- ROPA, Article 13/14 and Article 28 matrices
- AI Act/GDPR documentation indexes
- current SBOM/supply-chain evidence
- open-source license diligence summary

### BIG_TECH_MA_INITIAL_PACK
Pre-NDA/initial disclosure is deliberately limited to:
- one-pager
- short deck
- product summary
- architecture summary
- security overview
- canonical buyer Q&A
- controlled data-room index
- high-level pentest status
- this universal share policy
- M&A IP/software diligence index

Do not automatically send source code, raw production exports, credentials, customer data, pentest exploit details, privileged legal advice or provider-account secrets.

## Classification

`PUBLIC`: published buyer-safe product/trust material.  
`INITIAL_SHARE`: safe for identified prospective buyer without raw sensitive evidence.  
`NDA_REQUIRED`: detailed architecture/security/provider evidence.  
`DILIGENCE_ONLY`: transaction/security/legal review material shared on need-to-know basis.  
`HIGHLY_CONFIDENTIAL`: source code, raw security reproduction detail, sensitive provider configuration.  
`WAITING_EXTERNAL`: external assurance/counterparty event not internally creatable.

## Current external non-pass facts

- clean independent pentest/retest: `WAITING_EXTERNAL_SECURITY`;
- ISO 27001: `NOT_CERTIFIED`;
- SOC 2: `NOT_AUDITED`;
- buyer SAML/IdP activation: `WAITING_BUYER_SPECIFIC_CONFIG`;
- buyer acceptance/contracts: `WAITING_BUYER`;
- WORM storage: `NOT_HELD`;
- measured provider-supported RTO/RPO: `NOT_MEASURED`;
- cyber/E&O insurance: `NOT_HELD_OR_NOT_EVIDENCED`.

## Internal package decision

```text
SMB_BUYER_PACKAGE=PASS_INTERNAL
MID_MARKET_BUYER_PACKAGE=PASS_INTERNAL
ENTERPRISE_BUYER_PACKAGE=PASS_INTERNAL
BIG_TECH_MA_DATA_ROOM=PASS_INTERNAL_INDEX
BUYER_ACCEPTANCE=WAITING_BUYER
```
