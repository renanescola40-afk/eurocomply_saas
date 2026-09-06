# CSA STAR for AI Level 1 — AI-CAIQ v1.1.0 Response Summary

Status: **SUBMISSION CANDIDATE / AUTHORIZED-HUMAN SUBMISSION PENDING**

Assessment scope: RISCK COMPLY as an Application Provider (AP).  
Official questionnaire: AI-CAIQ v1.1.0, **320 assessment questions**, AICM v1.1 (**247 control objectives / 18 domains**).

## Completed response distribution

- Yes: **100**
- No: **132**
- NA: **88**
- Total answered: **320 / 320**
- SSRM ownership assigned: **320 / 320**
- Implementation descriptions: **320 / 320**
- Customer-responsibility descriptions: **320 / 320**

Ownership distribution:

- Owned by AP: **223**
- Owned by CSP: **47**
- Shared across the supply chain: **25**
- Owned by MP: **22**
- Shared AP-AIC: **3**

## Spreadsheet QA

The completed workbook was checked as a submission candidate against the official AI-CAIQ v1.1.0 structure.

Verified:

- four official sheets remain present: `Introduction`, `AI-CAIQv1.1.0`, `LLM Taxonomy`, `Change Log`;
- all 320 official question IDs are populated with `Yes`, `No`, or `NA`;
- no blank ownership values among the 320 questions;
- no blank implementation-description values among the 320 questions;
- no blank customer-responsibility values among the 320 questions;
- no common spreadsheet formula-error markers were detected.

Private artifact:

`RISCK_COMPLY_AI_CAIQ_v1.1.0_SUBMISSION_CANDIDATE.xlsx`

The spreadsheet is not committed to the public repository because the CSA-distributed questionnaire carries redistribution restrictions.

## Interpretation

This assessment is intentionally evidence-conservative. `No` does not necessarily mean the product is insecure; it means the complete requirement represented by the specific AI-CAIQ question is not currently evidenced as fully implemented for the assessed service. `NA` is used for controls outside the direct AP scope, principally provider-operated datacenter/base-model controls or AI-runtime controls for which no applicable production model/agent runtime is evidenced.

STAR for AI Level 1 is a transparency self-assessment. The objective is a truthful public disclosure, not artificially maximizing the number of `Yes` responses.

## Major inherited / NA areas

- physical datacenter controls -> CSP;
- base-model training, model weights/checkpoints and training pipeline -> Model Provider where applicable;
- detailed provider KMS key lifecycle -> CSP;
- physical-access logging / host-hypervisor hardening -> CSP;
- AI-model/agent runtime controls -> NA where no applicable RISCK COMPLY production model/agent runtime is evidenced.

## Main material `No` categories

1. Completed independent assurance / penetration testing.
2. Accepted continuity/restore exercise and measured RPO/RTO evidence.
3. Final provider/subprocessor/DPA reconciliation.
4. Formal HR/personnel-security program and training records.
5. Company endpoint/MDM/EDR program evidence.
6. Formal organization-wide policies with explicit approval, communication, evaluation and annual review evidence.
7. Customer-managed encryption keys and some advanced logging/SIEM capabilities not currently offered/evidenced.

## Strongest evidence areas

- application/API security and secure SDLC;
- tenant isolation, authorization, RLS/FORCE RLS and privileged access;
- controlled change/release/rollback;
- GDPR operational data handling, DSAR/export/delete and privacy-by-design mechanisms;
- audit/activity logging and incident response;
- threat modelling, dependency/security scanning and vulnerability remediation workflows;
- AI governance/QMS/CAPA/FRIA/GPAI governance capabilities.

## External submission boundary

The public CSA organization-submission form was revalidated on 2026-09-06. The remaining steps are not questionnaire-engineering tasks:

- identify an eligible Backup Point of Contact, or obtain CSA guidance for a sole-operator organization;
- complete authorized submitter/contact fields;
- upload the private AI-CAIQ candidate;
- complete the anti-bot/humanizer step;
- personally accept legal authority, terms and public-publication declarations;
- submit;
- complete CSA's confirmation email within 48 hours;
- verify the public STAR Registry listing.

No second person, legal attestation, CAPTCHA/humanizer response or acceptance of terms is to be fabricated or performed by an automated workstream on the owner's behalf.

## Cost boundary

Standard STAR for AI Level 1 is described by CSA as the foundational designation earned by submitting the AI-CAIQ self-assessment. The separately offered Valid-AI-ted enhancement is currently listed at **USD 595** for non-corporate members and is not selected in this zero-new-cost workstream.

## Submission safety rule

Do not claim `CSA Certified`, `STAR for AI Level 1`, regulator approval, ISO/IEC 42001 certification, completed independent pentest or complete legal approval until the corresponding external/registry evidence actually exists.

## Current closure state

**AI_CAIQ_COMPLETION = 320/320**  
**QUESTIONNAIRE_QA = PASS**  
**PRIVATE_SUBMISSION_CANDIDATE = READY**  
**STAR_REGISTRY_SUBMISSION = AUTHORIZED_HUMAN_REQUIRED**  
**PUBLIC_DESIGNATION = PENDING**
