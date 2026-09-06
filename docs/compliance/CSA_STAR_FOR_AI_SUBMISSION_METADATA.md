# CSA STAR for AI Level 1 — Submission Metadata

Status: **SUBMISSION CANDIDATE READY / AUTHORIZED-HUMAN SUBMISSION PENDING**  
Target: CSA STAR for AI Level 1  
Framework: AICM v1.1 / AI-CAIQ v1.1.0  
Assessment role: Application Provider (AP)

## Service name

**RISCK COMPLY**

## Service type

Multi-tenant B2B SaaS application.

## Organization / operator context

Brand / service: **RISCK COMPLY**  
Legal entity used for current company materials: **Samuel Cerqueira, Unipessoal Lda.**  
Jurisdiction: Portugal  
Website: `https://www.risckcomply.com`

The STAR submission UI must use the exact legal/company data of the authorized submitting organization. Do not substitute the brand for a legal-entity field when the form requests the legal organization.

## Primary AICM role

**Application Provider (AP)**

Rationale: RISCK COMPLY provides an end-user SaaS application that operationalizes AI governance and compliance workflows and may integrate managed infrastructure and third-party AI/model services. The assessment therefore distinguishes application-provider responsibilities from inherited infrastructure/model-provider controls and customer responsibilities.

## Short service description — registry candidate

> RISCK COMPLY is a multi-tenant B2B SaaS platform for European organisations that need to operationalise AI governance, EU AI Act readiness, AI-system inventory, risk classification, evidence management, policy and approval workflows, technical-documentation preparation, monitoring and auditability. The service supports governance and evidence operations and is not a regulator, notified body, certification authority, law firm or automatic guarantee of legal compliance.

## Scope statement — candidate

The self-assessment scope is the RISCK COMPLY SaaS application and the security, privacy, governance and AI-use controls operated by RISCK COMPLY at the application/service layer.

Inherited controls operated by hosting, database/authentication, payment, observability, communications and third-party AI/model providers are treated as shared or provider-owned where appropriate. Physical datacenter controls and foundation-model training/weight controls are not represented as RISCK COMPLY-owned unless direct evidence establishes otherwise.

## Assessment description — candidate

> This AI-CAIQ self-assessment describes the controls implemented, shared, inherited or not applicable to RISCK COMPLY as an Application Provider. Answers are evidence-backed and distinguish repository implementation, operational procedures, production/runtime proof and third-party/provider evidence. `No` and `Not Applicable` responses are used where a control is not implemented, not owned by the assessed service, or cannot be truthfully evidenced within scope.

## Official questionnaire QA — completed

Official working source: **AI-CAIQ v1.1.0 / AICM v1.1**.

The completed submission candidate has been verified against the official questionnaire structure:

- official AI-CAIQ questions: **320**;
- responses populated: **320 / 320**;
- SSRM ownership populated: **320 / 320**;
- implementation descriptions populated: **320 / 320**;
- customer-responsibility descriptions populated: **320 / 320**;
- response distribution: **100 Yes / 132 No / 88 NA**;
- ownership distribution: **223 Owned by AP / 47 Owned by CSP / 25 Shared across the supply chain / 22 Owned by MP / 3 Shared AP-AIC**;
- workbook sheets preserved: `Introduction`, `AI-CAIQv1.1.0`, `LLM Taxonomy`, `Change Log`;
- formula/error scan: no spreadsheet formula-error markers detected.

The conservative distribution is intentional. STAR for AI Level 1 is a transparency self-assessment, not a requirement to convert gaps into `Yes` answers.

## Working spreadsheet handling

The filled AI-CAIQ spreadsheet is maintained as a private submission artifact and **must not be committed to the public repository**. The CSA-distributed workbook includes copyright restrictions against redistribution. Only the response summary, evidence map and preparation metadata belong in the public repository.

Current private artifact name:

`RISCK_COMPLY_AI_CAIQ_v1.1.0_SUBMISSION_CANDIDATE.xlsx`

## Registry response object mapping

For each official AI-CAIQ question:

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

## Known disclosure points preserved in the candidate

The assessment deliberately does not overclaim the following:

1. Independent penetration testing / independent assurance without actual external evidence.
2. Restore-drill/RTO/RPO controls where targets are not yet backed by accepted measured runtime evidence.
3. Provider/subprocessor/DPA facts that require provider/account-specific reconciliation.
4. Formal HR/security-training controls that are not evidenced.
5. Company-wide MDM/EDR/endpoint-management controls that are not evidenced.
6. Managed-provider encryption, physical datacenter and infrastructure controls as RISCK COMPLY-owned controls.
7. Foundation/GPAI model training, weight security and training-data provenance where RISCK COMPLY only consumes a third-party API/model.

## Current CSA submission route — verified 2026-09-06

Official STAR for AI page: `https://cloudsecurityalliance.org/star/ai/`  
Official STAR submission page: `https://cloudsecurityalliance.org/star/submit`  
Organization submission form: `https://star.watch/en/star_submissions/new`

CSA currently describes STAR for AI Level 1 as a foundational designation earned by completing and submitting the AI-CAIQ self-assessment to the STAR Registry.

The optional **Valid-AI-ted** enhancement is separately priced at **USD 595** for non-corporate members. It is **not required** for standard STAR for AI Level 1. This workstream must not select or purchase Valid-AI-ted without explicit owner authorization.

## Authorized-human submission boundary

The public organization submission form currently requires information/actions that must not be invented or accepted by an assistant on behalf of the organization:

1. submitter name and email;
2. **Backup Point of Contact** — CSA says this should be another person at the organization, in a similar role, authorized to make registry-entry changes;
3. organization phone number;
4. country and region;
5. registry entry type, registry scheme and service category;
6. primary-document upload;
7. anti-bot / humanizer response;
8. declaration that the submitter is a legal employee of the organization and has full authority to submit;
9. acceptance of CSA STAR Terms and CSA website Terms;
10. consent to public publication of the submission contents;
11. acknowledgement of the post-submit confirmation process;
12. submission confirmation received by email and acted on within **48 hours**.

### Current genuine human blocker

`BACKUP_POC_REQUIRED` — do not invent a second person. If the legal entity has no second eligible person, the authorized owner should obtain CSA guidance on the acceptable sole-employee/sole-director submission path before submitting.

`LEGAL_ATTESTATION_REQUIRED` — the authorized human must personally accept the authority/terms/publication declarations.

`EMAIL_CONFIRMATION_REQUIRED` — after submission, the confirmation message must be completed within CSA's stated 48-hour window.

No email is to be sent by this workstream without explicit owner authorization.

## Public wording after registry acceptance

### Recommended

> RISCK COMPLY has completed a CSA STAR for AI Level 1 AI-CAIQ self-assessment and published it in the Cloud Security Alliance STAR Registry.

### Required qualification

> STAR for AI Level 1 is a self-assessment designation. It is not a STAR for AI Level 2 independent certification, ISO/IEC 42001 certification, or a determination that RISCK COMPLY or its customers are legally compliant with the EU AI Act.

### Prohibited before acceptance

- `CSA certified`
- `CSA STAR certified`
- `independently audited by CSA`
- `CSA approved`
- `ISO 42001 certified`
- `EU AI Act certified`
- use of a CSA/STAR badge or registry designation implying acceptance before the official listing is live

## Submission-ready checklist

- [x] Current target version identified: AI-CAIQ v1.1.0 / AICM v1.1.
- [x] Application Provider role established.
- [x] Internal evidence index created.
- [x] Truthfulness rules established.
- [x] Registry response-field mapping prepared.
- [x] Service description drafted from canonical product description.
- [x] Official complete AI-CAIQ v1.1.0 question set retrieved.
- [x] Every official question answered.
- [x] Every official question assigned SSRM ownership.
- [x] Every official question contains implementation rationale.
- [x] Every official question contains a customer-responsibility statement.
- [x] Final structural/spreadsheet QA completed.
- [x] Private submission-candidate XLSX exported.
- [ ] Eligible Backup PoC established or CSA-approved sole-operator alternative obtained.
- [ ] Authorized STAR Platform human fields/authentication completed.
- [ ] Legal authority / terms / publication declarations personally accepted by authorized submitter.
- [ ] Assessment submitted.
- [ ] CSA confirmation email completed within 48 hours.
- [ ] Public STAR Registry entry verified.

## Current status

**TECHNICAL_PREPARATION = COMPLETE**  
**QUESTIONNAIRE = 320/320 COMPLETE**  
**SUBMISSION_ARTIFACT = READY**  
**EXTERNAL_SUBMISSION = HUMAN-AUTHORIZATION BLOCKED**  
**PUBLIC STAR FOR AI LEVEL 1 CLAIM = NOT YET ALLOWED**
