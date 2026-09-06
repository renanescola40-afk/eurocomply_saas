# CSA STAR for AI Level 1 — Submission Metadata

Status: DRAFT — internal preparation only  
Target: CSA STAR for AI Level 1  
Framework: AICM v1.1 / AI-CAIQ v1.1.0

## Service name

**RISCK COMPLY**

## Service type

Multi-tenant B2B SaaS application.

## Primary AICM role

**Application Provider (AP)**

Rationale: RISCK COMPLY provides an end-user SaaS application that operationalizes AI governance and compliance workflows and may integrate managed infrastructure and third-party AI/model services. The assessment must therefore distinguish application-provider responsibilities from inherited infrastructure/model-provider controls and customer responsibilities.

## Short service description — registry draft

> RISCK COMPLY is a multi-tenant B2B SaaS platform for European organisations that need to operationalise AI governance, EU AI Act readiness, AI-system inventory, risk classification, evidence management, policy and approval workflows, technical-documentation preparation, monitoring and auditability. The service supports governance and evidence operations and is not a regulator, notified body, certification authority, law firm or automatic guarantee of legal compliance.

## Scope statement — draft

The self-assessment scope is the RISCK COMPLY SaaS application and the security, privacy, governance and AI-use controls operated by RISCK COMPLY at the application/service layer.

Inherited controls operated by hosting, database/authentication, payment, observability, communications and third-party AI/model providers are treated as shared or provider-owned where appropriate. Physical datacenter controls and foundation-model training/weight controls are not represented as RISCK COMPLY-owned unless direct evidence establishes otherwise.

## Assessment description — draft

> This AI-CAIQ self-assessment describes the controls implemented, shared, inherited or not applicable to RISCK COMPLY as an Application Provider. Answers are evidence-backed and distinguish repository implementation, operational procedures, production/runtime proof and third-party/provider evidence. `No` and `Not Applicable` responses are used where a control is not implemented, not owned by the assessed service, or cannot be truthfully evidenced within scope.

## Registry response object mapping

For each official AI-CAIQ question, prepare:

| Registry/API field | RISCK COMPLY source |
| --- | --- |
| `question_id` | exact official AI-CAIQ v1.1.0 question ID |
| `answer` | `yes`, `no`, or `na` based on evidence |
| `comment` | concise rationale and evidence summary |
| `ssrm_csp_comment` | RISCK COMPLY implementation / provider responsibility |
| `ssrm_csc_comment` | customer responsibility, when applicable |

## Standard answer patterns

### Implemented / provider-owned by RISCK COMPLY

**Answer:** Yes  
**Implementation:** Describe the actual application control, policy, workflow or operational process.  
**Evidence:** Reference repository/runtime evidence.  
**Customer responsibility:** State only if the control requires customer configuration or action.

### Shared with managed provider

**Answer:** Yes only when the RISCK COMPLY portion is actually implemented and the inherited portion is sufficiently supported. Otherwise use No/NA as appropriate.  
**Implementation:** Explicitly separate RISCK COMPLY configuration/integration responsibility from the provider's infrastructure responsibility.  
**Evidence:** RISCK COMPLY configuration/runtime evidence plus provider evidence where the question requires it.

### Not implemented

**Answer:** No  
**Comment:** State the current limitation plainly. Do not replace a missing control with roadmap language.

### Not applicable / outside role

**Answer:** NA  
**Comment:** Explain why the control is outside the Application Provider scope or is exclusively operated by another party. `NA` must not be used merely to avoid disclosing a gap.

## Customer shared-responsibility baseline

Potential customer responsibilities, only where relevant to an exact control:

- configure organization membership and authorized roles appropriately;
- protect user credentials and configured authentication factors;
- provide data lawfully and avoid prohibited/unauthorized data;
- review AI-generated or compliance-support outputs before material reliance;
- maintain customer-specific human oversight, approvals and accountability;
- maintain obligations and controls outside the contractual/service scope;
- promptly report suspected incidents or unauthorized access;
- configure customer-specific retention, governance and workflow choices where the product exposes them.

## Known disclosure points for final submission

The final assessment must preserve the following boundaries unless newer accepted evidence changes them:

1. Independent penetration testing / independent assurance must not be claimed without the actual external evidence.
2. Restore-drill/RTO/RPO controls must distinguish targets from measured accepted runtime evidence.
3. Provider/subprocessor/DPA facts must be reconciled before making final contractual/provider-security assertions.
4. Formal HR/security-training controls must not be invented.
5. Company-wide MDM/EDR/endpoint-management controls must not be invented.
6. Managed-provider encryption, physical datacenter and infrastructure controls must be identified as inherited/shared.
7. Foundation/GPAI model training, weight security and training-data provenance must remain model-provider responsibilities when RISCK COMPLY only consumes a third-party API/model.

## Public wording after registry acceptance

### Recommended

> RISCK COMPLY has completed a CSA STAR for AI Level 1 AI-CAIQ self-assessment and published it in the Cloud Security Alliance STAR Registry.

### Required qualification

> STAR for AI Level 1 is a self-assessment designation. It is not a STAR Level 2 independent audit or certification, ISO/IEC 42001 certification, or a determination that RISCK COMPLY or its customers are legally compliant with the EU AI Act.

### Prohibited before acceptance

- `CSA certified`
- `CSA STAR certified`
- `independently audited by CSA`
- `CSA approved`
- `ISO 42001 certified`
- `EU AI Act certified`
- use of a CSA/STAR badge or registry designation implying acceptance before the official listing is live

## Authentication boundary

Final retrieval/submission may require a STAR Platform account, account authentication and/or an API key. Credentials, MFA, CAPTCHA and personal/legal attestations must be performed by the authorized account holder. No credentials should be committed to the repository.

## Submission-ready checklist

- [x] Current target version identified: AI-CAIQ v1.1.0 / AICM v1.1.
- [x] Application Provider role established.
- [x] Internal evidence index created.
- [x] Truthfulness rules established.
- [x] Registry response-field mapping prepared.
- [x] Service description drafted from canonical repository product description.
- [ ] Official complete AI-CAIQ v1.1.0 question set retrieved.
- [ ] Every question mapped to evidence/ownership.
- [ ] Provider/shared-responsibility evidence reconciled.
- [ ] Final Yes/No/NA review completed.
- [ ] Authorized STAR Platform authentication completed.
- [ ] Assessment submitted.
- [ ] Public STAR Registry entry verified.
