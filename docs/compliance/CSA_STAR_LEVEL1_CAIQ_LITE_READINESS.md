# RISCK COMPLY — CSA STAR Level 1 / CAIQ-Lite v4.1 Readiness

**Status:** PRE-SUBMISSION / EVIDENCE MAPPING  
**Date:** 2026-09-06  
**Service:** RISCK COMPLY  
**Legal organization:** SAMUEL CERQUEIRA, UNIPESSOAL LDA  
**Production:** https://www.risckcomply.com

## Objective

Prepare a truthful, no-cost CSA STAR Level 1 cloud-security self-assessment in parallel with the already-submitted STAR for AI Level 1 assessment.

The current CSA CCM-Lite/CAIQ-Lite release is based on CCM v4.1. CSA describes CCM-Lite as 96 selected controls from the full 207-control CCM and CAIQ-Lite as 138 focused questions across the same 17 cloud-security domains. Current CSA STAR Registry listings show CAIQ Lite Self-assessment v4.1.0 entries under STAR Level 1.

Official sources:

- https://cloudsecurityalliance.org/artifacts/ccm-lite-and-caiq-lite-v4/
- https://cloudsecurityalliance.org/artifacts/cloud-controls-matrix-v4-1
- https://cloudsecurityalliance.org/star/registry

## Claim boundary

Until RISCK COMPLY is actually accepted and publicly listed in the CSA STAR Registry:

- do not claim `CSA STAR Level 1` as obtained;
- do not claim `CSA Certified`;
- do not use a STAR badge as an approved/listed badge;
- describe this work only as `CAIQ-Lite v4.1 self-assessment preparation`.

After a public registry listing, the preferred wording is:

> CSA STAR Level 1 — CAIQ Lite Self-assessment v4.1.0 listed in the CSA STAR Registry.

This remains a Level 1 self-assessment, not a third-party certification.

## Why CAIQ-Lite first

CAIQ-Lite is the most efficient current cloud-security transparency route for this stage:

- 138 focused questions rather than the full CAIQ v4.1 set;
- 96 foundational CCM v4.1 controls;
- all 17 domains remain represented;
- current STAR Registry listings demonstrate that CAIQ Lite Self-assessment v4.1.0 is published under STAR Level 1;
- it complements, rather than duplicates, STAR for AI Level 1.

The full CAIQ v4.1 can remain a later expansion once the Lite assessment is complete and the operating evidence matures.

## Existing RISCK COMPLY evidence by CCM domain

| CCM domain | Existing evidence / implementation | Current conservative posture |
| --- | --- | --- |
| A&A — Audit & Assurance | audit-chain runtime proofs, evidence manifests, qualified review workflows, QMS/CAPA material | PARTIAL / STRONG INTERNAL EVIDENCE |
| AIS — Application & Interface Security | CodeQL, Semgrep, Gitleaks, DAST, API hardening checks, secure upload controls, threat model | PARTIAL / STRONG TECHNICAL EVIDENCE |
| BCR — Business Continuity Management & Operational Resilience | backup/continuity docs, recovery workflows, restore-drill evidence lanes | PARTIAL — measured restore/RPO/RTO closure still matters |
| CCC — Change Control & Configuration Management | PR/CI/release gates, rollback plan, branch/release governance, CODEOWNERS | STRONG INTERNAL EVIDENCE |
| CEK — Cryptography, Encryption & Key Management | HTTPS/TLS, managed-provider encryption, secret-handling controls | PARTIAL — provider/KMS lifecycle evidence remains inherited |
| DCS — Datacenter Security | Vercel/Supabase/Cloudflare managed infrastructure | INHERITED / PROVIDER-OWNED |
| DSP — Data Security & Privacy Lifecycle | data inventory, processing overview, privacy runbooks, export/delete controls, retention/evidence contracts | PARTIAL / STRONG INTERNAL EVIDENCE |
| GRC — Governance, Risk & Compliance | EU AI Act governance lifecycle, QMS, enterprise governance, risk workflows, public claims guard | STRONG INTERNAL EVIDENCE |
| HRS — Human Resources Security | limited formal HR/security-personnel evidence | GAP / OWNER-ORGANIZATIONAL EVIDENCE NEEDED |
| IAM — Identity & Access Management | Supabase Auth, RBAC, RLS, tenant scoping, privileged-access/break-glass governance, auth runtime proof | STRONG TECHNICAL EVIDENCE |
| IPY — Interoperability & Portability | exports and portability-related product/data handling | PARTIAL |
| IVS — Infrastructure & Virtualization Security | managed hosting/provider architecture, edge security, environment separation | PARTIAL / INHERITED |
| LOG — Logging & Monitoring | audit logs, Sentry/monitoring evidence, runtime proof, incident/status authority | PARTIAL / STRONG INTERNAL EVIDENCE |
| SEF — Security Incident Management, E-Discovery & Cloud Forensics | incident response runbooks, post-incident review, disclosure channel, status page | PARTIAL |
| STA — Supply Chain Management, Transparency & Accountability | subprocessors register, provider factual evidence register, vendor assurance/procurement materials | PARTIAL — final DPA/subprocessor facts still open |
| TVM — Threat & Vulnerability Management | threat model, CodeQL, Semgrep, Gitleaks, dependency review/audit, DAST, security CI | STRONG TECHNICAL EVIDENCE; independent pentest still external |
| UEM — Universal Endpoint Management | no complete company endpoint MDM/EDR evidence | GAP / ORGANIZATIONAL CONTROL NEEDED |

## Evidence anchors already available

Primary repository evidence includes:

- `SECURITY.md`
- `docs/security/THREAT_MODEL.md`
- `docs/operations/INCIDENT_RESPONSE_RUNBOOK.md`
- `docs/BACKUP_AND_CONTINUITY.md`
- `docs/RELEASE_ROLLBACK_PLAN.md`
- `docs/privacy/DATA_INVENTORY.md`
- `docs/privacy/DATA_PROCESSING_OVERVIEW.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`
- `docs/enterprise/ENTERPRISE_PRIVILEGED_ACCESS_GOVERNANCE.md`
- `docs/enterprise/ENTERPRISE_BREAK_GLASS_GOVERNANCE.md`
- `.github/workflows/full-security-suite.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/auth-rbac-runtime-proof.yml`
- `.github/workflows/audit-chain-runtime-proof.yml`
- `.github/workflows/data-governance-runtime-proof.yml`
- `.github/dependabot.yml`
- `.github/CODEOWNERS`

## Truthfulness rules for filling CAIQ-Lite

1. A repository document alone does not prove an operational control is implemented.
2. Provider infrastructure capabilities are not automatically RISCK COMPLY-owned controls.
3. `Yes` requires implementation evidence appropriate to the question.
4. `No` is acceptable where a control is not yet implemented or not evidenced.
5. `NA` is used only when the control genuinely does not apply to the assessed SaaS/service responsibility model.
6. Do not treat a planned penetration test as a completed independent assessment.
7. Do not treat draft DPA/subprocessor material as final contractual proof.
8. Do not claim HR/UEM controls without actual organizational evidence.
9. Keep cloud-provider inheritance explicit.
10. Preserve exact questionnaire wording and structure in the official workbook.

## Current blockers before a truthful submission

### File / portal dependency

The official current CAIQ-Lite v4.1 workbook must be obtained from CSA or an exact current STAR-compatible source before final response population. Do not reconstruct or invent the official questionnaire text.

### Evidence gaps that can materially affect answers

- formal HR/personnel-security controls;
- endpoint/MDM/EDR organizational controls;
- final provider/subprocessor DPA/legal evidence;
- measured recovery/restore evidence where required;
- independent penetration-test completion;
- some provider-specific encryption/key-management facts.

These gaps do not prevent starting the assessment. They must remain truthful `No`, inherited/shared, or `NA` where appropriate rather than being cosmetically converted to `Yes`.

## Execution sequence

1. Obtain the official current CAIQ-Lite v4.1 workbook.
2. Preserve the original workbook untouched.
3. Fill only designated answer/implementation/responsibility fields.
4. Map every response to repository/runtime/provider evidence.
5. Run a conservative internal review for unsupported `Yes` answers.
6. Generate a response summary and gap report.
7. Owner performs any legal-authority/publication confirmations required by CSA.
8. Submit the self-assessment to STAR.
9. Confirm the CSA email if required.
10. Verify the public registry listing before any public claim or badge.

## Procurement value

When listed, this should be placed alongside STAR for AI Level 1 in the enterprise procurement package because the two assessments address different buyer questions:

- **STAR Level 1 / CAIQ-Lite:** cloud security and privacy control transparency;
- **STAR for AI Level 1 / AI-CAIQ:** AI-specific security, governance and responsible-AI control transparency.

The combination is materially stronger than presenting generic scanner badges alone.
