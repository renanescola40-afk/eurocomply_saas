# CSA STAR for AI Level 1 — Readiness Workstream

Status: internal preparation only  
Product scope: RISCK COMPLY  
Target designation: CSA STAR for AI Level 1  
Assessment role: Application Provider (AP)  
Framework baseline: AICM v1.1 / AI-CAIQ v1.1.0  
Public claim allowed before registry acceptance: **none**

## Purpose

Prepare a truthful, evidence-backed AI-CAIQ self-assessment for submission to the Cloud Security Alliance STAR Registry.

This workstream must not claim certification, third-party assurance, ISO/IEC 42001 certification, or CSA validation. STAR for AI Level 1 is a self-assessment designation. Any public wording must wait until the CSA registry entry is accepted and visible.

## Submission principles

1. Answer only from evidence that exists or can be verified.
2. Use `Yes`, `No`, or `NA` conservatively.
3. A `No` is preferable to an unsupported `Yes`.
4. Distinguish repository implementation from production/runtime proof.
5. Distinguish RISCK COMPLY controls from inherited controls operated by Vercel, Supabase, payment providers, model providers, or other subprocessors.
6. Do not treat roadmap targets as implemented controls.
7. Do not treat documentation alone as runtime proof when the control requires operational evidence.
8. Customer responsibilities must be stated where the control uses shared responsibility.
9. No public CSA logo, badge, or designation claim until the official registry entry exists.

## Authoritative external baseline

- CSA AICM v1.1: https://cloudsecurityalliance.org/artifacts/ai-controls-matrix-v1-1
- CSA STAR for AI: https://cloudsecurityalliance.org/star/ai
- CSA STAR submission portal: https://cloudsecurityalliance.org/star/submit/
- CSA Application Provider implementation guidance: https://cloudsecurityalliance.org/artifacts/aicmv1-1-implementation-guidelines-for-application-providers-ap

## Product-role determination

RISCK COMPLY is assessed primarily as an **Application Provider (AP)** because it provides an end-user SaaS application that uses AI/model services to deliver domain-specific compliance and governance functionality.

Controls owned by infrastructure, model, or orchestration providers must not be represented as wholly implemented by RISCK COMPLY when they are inherited or shared.

## Evidence already present in the repository

The following evidence families already exist and should be mapped into AI-CAIQ responses:

- EU AI Act governance lifecycle and risk controls;
- data governance and privacy proof runbooks;
- GDPR operational controls;
- tenant isolation, RLS and organization-scoped authorization;
- temporary privileged-access governance and break-glass governance;
- incident-response playbooks and production incident runbooks;
- continuity, backup and restore-drill contracts;
- audit-chain and runtime evidence workflows;
- security questionnaire and procurement assurance material;
- provider/vendor governance and subprocessor material;
- GPAI / third-party model governance;
- quality-management-system governance;
- Annex IV technical-documentation workflows;
- FRIA / fundamental-rights governance;
- post-market monitoring and AI incident governance;
- CI, code review, dependency/security scanning and release governance.

## Preliminary 18-domain readiness map

This table is **not the final AI-CAIQ**. It is a triage map used to prioritize evidence collection before answering the questionnaire.

| AICM domain | Preliminary posture | Current evidence direction | Main closure risk |
| --- | --- | --- | --- |
| A&A — Audit & Assurance | AMBER | audit-chain workflows, evidence contracts, internal enterprise closeout material | independent assessment evidence is not yet sufficient for controls that explicitly require independence |
| AIS — Application & Interface Security | GREEN/AMBER | authentication, server-side authorization, input validation, API controls, route/action audit, security testing | production proof must match the exact submitted release scope |
| BCR — Business Continuity Management & Operational Resilience | AMBER | incident/continuity runbooks, backup and restore-drill contracts, rollback controls | measured restore drill and approved RPO/RTO must not be overstated |
| CCC — Change Control & Configuration Management | GREEN/AMBER | protected branch/release workflows, CI gates, review controls, deployment evidence | protected-production configuration must be reconciled with repository claims |
| CEK — Cryptography, Encryption & Key Management | AMBER | TLS expectations, protected configuration, export-encryption requirements, provider-managed encryption | inherited provider controls and key lifecycle details require explicit shared-responsibility wording |
| DCS — Datacenter Security | SHARED/NA | hosted providers operate physical infrastructure | do not claim physical datacenter controls as RISCK COMPLY-owned |
| DSP — Data Security & Privacy Lifecycle Management | GREEN/AMBER | GDPR controls, retention/delete/export workflows, data-governance proof, residency declarations | runtime/configuration evidence and provider contracts must support each Yes answer |
| GRC — Governance, Risk & Compliance | GREEN/AMBER | EU AI Act governance, QMS governance, risk workflows, procurement controls | management review cadence and formal approval evidence may be incomplete |
| HRS — Human Resources | AMBER/NA | ownership/runbook material and AI governance responsibilities | small-team personnel processes, training records, joiner/mover/leaver evidence may be limited |
| IAM — Identity & Access Management | GREEN/AMBER | RBAC, RLS, tenant isolation, privileged access, break-glass, expiry controls | production tenant-isolation and privileged-access runtime evidence must remain exact-SHA bound |
| IPY — Interoperability & Portability | AMBER | export workflows, portability-related product functions and controlled downloads | portability commitments must be distinguished from features not contractually guaranteed |
| IVS — Infrastructure Security | SHARED/AMBER | Vercel/Supabase architecture, protected environments, deployment controls | substantial portions are inherited; provider evidence must be referenced rather than invented |
| LOG — Logging & Monitoring | GREEN/AMBER | audit logs, audit-chain workflows, Sentry/monitoring references, post-market monitoring | live monitoring coverage and retention claims must be configuration-backed |
| MDS — Model Security | AMBER | GPAI/third-party model governance, AI governance lifecycle, provider governance | RISCK COMPLY does not own foundation-model training; model-provider responsibilities must be explicit |
| SEF — Security Incident Management, E-Discovery & Cloud Forensics | GREEN/AMBER | incident-response playbooks, incident continuity evidence, post-incident review | forensic/e-discovery capabilities beyond existing evidence must be answered No/NA where appropriate |
| STA — Supply Chain Management, Transparency & Accountability | GREEN/AMBER | vendor governance, subprocessor register, provider review material, third-party model governance | provider assurance evidence and current contractual facts require reconciliation |
| TVM — Threat & Vulnerability Management | AMBER | CodeQL/dependency controls, vulnerability-disclosure material, security tests | independent pentest / external security review remains a material gap for stronger Yes answers |
| UEM — Universal Endpoint Management | AMBER/NA | limited relevance for a hosted SaaS AP; endpoint controls may be customer-owned | corporate-device/MDM/EDR controls must not be invented if not implemented |

## Known high-priority gaps before final submission

### 1. Independent assurance

AICM includes controls that call for independent assessments. Repository self-review does not satisfy independence by itself. Where no completed independent assessment exists, the corresponding AI-CAIQ answers must remain `No`, `NA`, or narrowly scoped.

### 2. Restore / continuity runtime proof

Repository documentation contains RTO/RPO targets and restore-drill contracts, but targets are not equivalent to measured evidence. Final answers must use measured facts only.

### 3. Provider-shared controls

Physical datacenter, managed encryption-at-rest, cloud infrastructure hardening and foundation-model security are partly or primarily inherited. Responses must state provider ownership and RISCK COMPLY's integration/configuration responsibilities.

### 4. Human-resources controls

A small organization may legitimately mark some controls `NA` or `No`; it must not fabricate formal HR programs, training records, disciplinary processes, background screening, MDM/EDR programs or segregation-of-duty structures that do not exist.

### 5. Model-security boundary

RISCK COMPLY's scope is the application layer and governance of model use/integration. Foundation model training, weight security and training-dataset provenance must be attributed to the actual model provider unless RISCK COMPLY performs those activities itself.

## AI-CAIQ response contract

Every final response should be generated with these fields:

- **Question / control reference**
- **Answer:** Yes / No / NA
- **Ownership:** AP / Shared / Provider-owned / Customer-owned as applicable
- **Implementation description**
- **Evidence reference**
- **Customer responsibility**, where applicable
- **Runtime proof required:** Yes / No
- **Submission status:** Ready / Evidence pending / Gap accepted

## Customer responsibility baseline

Examples of customer responsibilities that may legitimately appear in the final questionnaire:

- configure authorized users and roles appropriately;
- maintain confidentiality of credentials and MFA factors;
- classify and lawfully provide data entered into the service;
- review generated compliance outputs before relying on them for material decisions;
- configure organization-specific governance, oversight and approvals;
- maintain applicable legal/regulatory obligations outside the scope of the SaaS;
- avoid entering prohibited or unauthorized data into third-party AI workflows;
- promptly report suspected security incidents or misuse.

## Public wording after acceptance

Permitted wording only after the registry entry is live:

> RISCK COMPLY has completed a CSA STAR for AI Level 1 AI-CAIQ self-assessment and published it in the Cloud Security Alliance STAR Registry.

Required qualification:

> STAR for AI Level 1 is a self-assessment designation. It is not STAR for AI Level 2, an independent audit, ISO/IEC 42001 certification, or a determination of regulatory compliance.

## Next execution block

1. Obtain or reproduce the current AI-CAIQ v1.1.0 submission template structure.
2. Map the 320 questionnaire items to repository/runtime evidence.
3. Generate conservative draft answers.
4. Flag questions requiring live/provider/human evidence.
5. Close owner-controlled gaps that are fast and truthful to close.
6. Prepare submission metadata and supporting assets.
7. Stop only at account authentication, CAPTCHA, personal attestation, or legal acceptance that requires the owner.
8. Submit only after final truthfulness review.
