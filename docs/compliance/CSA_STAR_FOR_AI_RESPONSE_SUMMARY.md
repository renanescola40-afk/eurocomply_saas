# CSA STAR for AI Level 1 — AI-CAIQ v1.1.0 Response Summary

Status: PRE-SUBMISSION / INTERNAL REVIEW

Assessment scope: RISCK COMPLY as an Application Provider (AP).
Official questionnaire: AI-CAIQ v1.1.0, 320 assessment questions, AICM v1.1 (247 control objectives / 18 domains).

## Current conservative response distribution

- Yes: 100
- No: 132
- NA: 88
- Total answered: 320 / 320
- SSRM ownership assigned: 320 / 320

## Interpretation

This is intentionally evidence-conservative. `No` does not necessarily mean the product is insecure; it means the complete requirement represented by the specific AI-CAIQ question is not currently evidenced as fully implemented for the assessed service. `NA` is used for controls outside the direct AP scope, principally provider-operated datacenter/base-model controls or AI-runtime controls for which no applicable production model/agent runtime is evidenced.

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

## Submission safety rule

Do not claim `CSA Certified`, `STAR for AI Level 1`, regulator approval, ISO/IEC 42001 certification, completed independent pentest or complete legal approval until the corresponding external/registry evidence actually exists.

The official filled XLSX is maintained as a working artifact outside the repository because this branch is documentation-only and the questionnaire is a CSA-distributed spreadsheet. The response decisions remain traceable through this summary and the evidence index.