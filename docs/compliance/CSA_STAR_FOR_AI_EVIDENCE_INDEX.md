# CSA STAR for AI Level 1 — Evidence Index

Status: internal preparation  
Target: CSA STAR for AI Level 1  
Framework: AICM v1.1 / AI-CAIQ v1.1.0  
Primary provider role: Application Provider (AP)

## Evidence grading

- **E1 — Repository implementation:** code, migration, workflow or configuration contract exists.
- **E2 — Operational procedure:** runbook, policy or process exists.
- **E3 — Runtime evidence:** dated/exact-release runtime proof exists and is accepted.
- **E4 — Independent/provider evidence:** evidence originates from an independent assessor or the responsible provider.
- **OPEN:** evidence missing, draft-only, configuration-bound or not yet accepted.

A final AI-CAIQ `Yes` must use evidence appropriate to the nature of the control. Documentation alone must not be treated as runtime or independent proof.

---

## A&A — Audit & Assurance

### Candidate evidence
- `docs/security/evidence/INCIDENT_CONTINUITY_EVIDENCE_CONTRACT.md` — evidence contract for incident/continuity validation. **E2**
- `.github/workflows/audit-chain-runtime-proof.yml` — runtime-proof workflow for audit chain. **E1**
- `.github/workflows/audit-chain-synthetic-recovery.yml` — synthetic audit-chain recovery workflow. **E1**
- `docs/trust/ISO27001_SOC2_READINESS.md` — assurance-readiness inventory. **E2**
- `docs/ENTERPRISE_10_10_FINAL_REPORT.md` — internal closeout evidence and explicit gaps. **E2**

### Submission posture
**AMBER.** Internal evidence is substantial, but internal review is not independent assurance. Any AICM objective requiring independent assessment, independent audit, independent penetration testing or externally issued assurance remains `No`, `NA` or narrowly scoped until E4 evidence exists.

---

## AIS — Application & Interface Security

### Candidate evidence
- `SECURITY.md` — security scope and supported controls. **E2**
- `docs/security/THREAT_MODEL.md` — application threats and required mitigations. **E2**
- `docs/product/ROUTE_AND_ACTION_AUDIT.md` — route/access/action audit. **E2**
- `.github/workflows/codeql.yml` — static security analysis workflow. **E1**
- `.github/workflows/ci.yml` — CI gates. **E1**
- `.github/workflows/code-review.yml` — code-review workflow. **E1**
- application-side authorization and validation routes under `src/app/api/**`. **E1**

### Submission posture
**GREEN/AMBER.** Strong repository evidence. Runtime-sensitive assertions remain evidence-bound.

---

## BCR — Business Continuity Management & Operational Resilience

### Candidate evidence
- `docs/BACKUP_AND_CONTINUITY.md` — continuity baseline and enterprise targets. **E2**
- `docs/operations/INCIDENT_RESPONSE_CONTINUITY_PROOF_RUNBOOK.md` — continuity proof procedure. **E2**
- `docs/operations/enterprise-restore-drill/README.md` — restore-drill contract. **E2**
- `docs/operations/enterprise-restore-drill/control-map.md` — restore evidence acceptance map. **E2**
- `docs/RELEASE_ROLLBACK_PLAN.md` — release rollback controls. **E2**
- `docs/database/PERFORMANCE_AND_RLS_REVIEW.md` — explicitly distinguishes backup configuration from restore proof. **E2**

### Open evidence
- accepted measured restore drill;
- measured and approved RTO/RPO;
- dated E3 restore evidence for the submission scope.

### Submission posture
**AMBER.** Do not convert roadmap RTO/RPO targets into implemented/contractual claims.

---

## CCC — Change Control & Configuration Management

### Candidate evidence
- `.github/CODEOWNERS` — ownership/review boundary. **E1**
- `.github/PULL_REQUEST_TEMPLATE.md` and `.github/pull_request_template.md` — review gates/checklists. **E1/E2**
- `.github/workflows/branch-protection-runtime-proof.yml` — protection-proof workflow. **E1**
- `.github/workflows/ci.yml` — CI checks. **E1**
- `.github/workflows/code-review.yml` — review workflow. **E1**
- `docs/security/THREAT_MODEL.md` — treats unreviewed production changes as a threat and points to CODEOWNERS/PR/branch protection. **E2**
- `docs/RELEASE_ROLLBACK_PLAN.md` — rollback process. **E2**

### Open evidence
Current branch-protection/required-check configuration must be reconciled with runtime evidence before broad `Yes` answers.

### Submission posture
**GREEN/AMBER.**

---

## CEK — Cryptography, Encryption & Key Management

### Candidate evidence
- `docs/operations/DATA_GOVERNANCE_PRIVACY_PROOF_RUNBOOK.md` — protected residency/retention/export-encryption assertions. **E2**
- `docs/security/PROTECTED_RUNTIME_ENVIRONMENT_GOVERNANCE.md` — protected configuration attestation model. **E2**
- `src/lib/trust/security-questionnaire.ts` — customer-safe encryption boundary. **E1/E2**

### Shared-responsibility boundary
Encryption at rest and portions of key management are provided by managed infrastructure providers. RISCK COMPLY must describe configuration/integration responsibilities without claiming provider-operated key lifecycle controls as its own.

### Submission posture
**AMBER / SHARED.**

---

## DCS — Datacenter Security

### Candidate evidence
Physical hosting is provided by managed cloud providers.

### Submission posture
**PROVIDER-OWNED / NA / SHARED**, depending on exact question. RISCK COMPLY must not claim physical perimeter, facilities, guards, environmental controls, hardware disposal or datacenter visitor controls that are performed by hosting/database providers.

---

## DSP — Data Security & Privacy Lifecycle Management

### Candidate evidence
- `docs/compliance/GDPR_OPERATIONAL_CONTROLS.md` — scoped export/delete/audit controls. **E2**
- `docs/operations/DATA_GOVERNANCE_PRIVACY_PROOF_RUNBOOK.md` — runtime-proof procedure for residency, retention and export encryption. **E2**
- `docs/architecture/decisions/2026-07-20-data-governance-privacy-audit-megapack.md` — fail-closed evidence architecture. **E2**
- `.github/workflows/data-governance-runtime-proof.yml` — runtime-proof workflow. **E1**
- `docs/privacy/DATA_INVENTORY.md` — data/provider inventory. **E2**
- `docs/privacy/DATA_PROCESSING_OVERVIEW.md` — processing/provider boundaries. **E2**

### Open evidence
Provider configuration and contractual facts must support claims about residency, retention, encryption, transfers and deletion.

### Submission posture
**GREEN/AMBER.**

---

## GRC — Governance, Risk & Compliance

### Candidate evidence
- `docs/compliance/EU_AI_ACT_GOVERNANCE_LIFECYCLE.md` — AI governance lifecycle. **E2**
- `src/server/ai-governance/governance-lifecycle.ts` — server-side governance controls. **E1**
- `docs/compliance/QUALITY_MANAGEMENT_SYSTEM_GOVERNANCE.md` — QMS governance. **E2**
- `docs/compliance/FRIA_FUNDAMENTAL_RIGHTS_GOVERNANCE.md` — fundamental-rights governance. **E2**
- `docs/compliance/ANNEX_IV_TECHNICAL_DOCUMENTATION.md` — technical documentation workflow. **E2**
- `docs/compliance/POST_MARKET_AI_INCIDENT_GOVERNANCE.md` — monitoring/incident governance. **E2**

### Submission posture
**GREEN/AMBER.** Formal management approvals/review cadence must be evidence-backed where required.

---

## HRS — Human Resources

### Evidence search result
No sufficiently clear repository evidence was identified for a formal employee security-awareness programme, background-screening programme, disciplinary process, joiner/mover/leaver HR procedure, or recurring personnel security training records.

### Submission posture
**AMBER / NA / NO.** Do not invent HR controls. Controls that are inapplicable because of organization structure may use `NA` only where the AI-CAIQ question and responsibility model support it.

---

## IAM — Identity & Access Management

### Candidate evidence
- `docs/PHASE4_ACCESS_MODEL.md` — actor/organization/minimum-role model. **E2**
- `docs/enterprise/ENTERPRISE_PRIVILEGED_ACCESS_GOVERNANCE.md` — temporary, scoped, auditable elevation. **E2**
- `src/server/enterprise/privileged-access-governance.ts` — privileged-access service. **E1**
- `src/app/api/team/privileged-access/route.ts` — scoped privileged-access API. **E1**
- `src/app/api/team/privileged-access/[requestId]/decision/route.ts` — independent decision workflow. **E1**
- `supabase/migrations/20260726123000_enterprise_privileged_access_governance.sql` — RLS/FORCE RLS controls. **E1**
- `docs/enterprise/ENTERPRISE_ACCESS_RELEASE_FINAL_CLOSEOUT.md` — completed access-control workstream. **E2**
- `.github/workflows/auth-rbac-runtime-proof.yml` — auth/RBAC runtime proof. **E1**

### Submission posture
**GREEN/AMBER.** Production proof must remain exact-release scoped.

---

## IPY — Interoperability & Portability

### Candidate evidence
- GDPR/export functionality and controlled enterprise exports. **E1/E2**
- `docs/security/GOVERNANCE_EXPORTS.md` — privileged governance export contract. **E2**

### Submission posture
**AMBER.** Answer only for actual export/portability functionality. Do not imply broad standards interoperability or contractual portability guarantees where none exist.

---

## IVS — Infrastructure Security

### Candidate evidence
- Vercel deployment architecture and protected-environment governance. **E2/E4 shared**
- Supabase database/auth/storage controls. **E1/E4 shared**
- `docs/security/PROTECTED_RUNTIME_ENVIRONMENT_GOVERNANCE.md`. **E2**
- release/deployment workflows under `.github/workflows/**`. **E1**

### Submission posture
**AMBER / SHARED.** Infrastructure hardening and underlying host controls are substantially provider-operated.

---

## LOG — Logging & Monitoring

### Candidate evidence
- `.github/workflows/audit-chain-runtime-proof.yml` — audit-chain verification. **E1**
- `.github/workflows/audit-chain-synthetic-recovery.yml` — audit recovery proof. **E1**
- `docs/RELEASE_DEPLOYMENT_EVIDENCE.md` — deployment validation includes audit and error-monitoring checks. **E2**
- `docs/RELEASE_POST_DEPLOY_SMOKE_VALIDATION.md` — post-deploy validation. **E2**
- `docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md` — monitoring target and alert-routing evidence requirements. **E2**
- `docs/compliance/POST_MARKET_AI_INCIDENT_GOVERNANCE.md` — AI post-market monitoring. **E2**

### Submission posture
**GREEN/AMBER.** Live monitoring coverage, retention and alert routing require current configuration/runtime proof.

---

## MDS — Model Security

### Candidate evidence
- `docs/compliance/GPAI_THIRD_PARTY_MODEL_GOVERNANCE.md` — third-party model inventory, operator role, provider documentation, downstream integration, evidence and approval. **E2**
- `supabase/migrations/20260721123000_gpai_third_party_model_governance.sql` — persistence/governance model. **E1**
- `tests/gpai-third-party-models-migration-contract.test.ts` — migration contract tests. **E1**

### Responsibility boundary
RISCK COMPLY is not assumed to train or host the weights of third-party foundation/GPAI models. Training-data provenance, weight storage/security, pretraining controls and base-model lifecycle controls are provider-owned unless evidence shows otherwise. Application-layer model selection, integration, governance and output-use controls may be RISCK COMPLY-owned.

### Submission posture
**AMBER / SHARED.**

---

## SEF — Security Incident Management, E-Discovery & Cloud Forensics

### Candidate evidence
- `docs/INCIDENT_RESPONSE.md` — incident response baseline. **E2**
- `docs/operations/INCIDENT_RESPONSE_RUNBOOK.md` — production incident roles/triage/mitigation. **E2**
- `docs/RELEASE_INCIDENT_RESPONSE_PLAN.md` — release incident process. **E2**
- `docs/RELEASE_POST_INCIDENT_REVIEW.md` — post-incident review. **E2**
- `docs/security/evidence/INCIDENT_CONTINUITY_EVIDENCE_CONTRACT.md` — canonical proof contract. **E2**

### Submission posture
**GREEN/AMBER.** Specialized e-discovery/forensics capabilities must be `No/NA` unless actually implemented.

---

## STA — Supply Chain Management, Transparency & Accountability

### Candidate evidence
- `.github/dependabot.yml` — dependency update control. **E1**
- `.github/workflows/codeql.yml` and CI/security workflows — software supply-chain checks. **E1**
- `docs/security/THREAT_MODEL.md` — supply-chain compromise threat and dependency controls. **E2**
- `docs/trust/SUBPROCESSORS.md` — subprocessor-register draft. **E2 / OPEN**
- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` — provider assurance status. **E2 / OPEN**
- `docs/privacy/DATA_INVENTORY.md` — provider roles. **E2**
- `docs/compliance/GPAI_THIRD_PARTY_MODEL_GOVERNANCE.md` — third-party model/provider governance. **E2**

### Material open fact
The provider evidence register currently records the subprocessor/DPA register as not yet passing. Draft legal/provider material must not be described as final, counsel-approved or fully reconciled.

### Submission posture
**AMBER.**

---

## TVM — Threat & Vulnerability Management

### Candidate evidence
- `docs/security/THREAT_MODEL.md` — threat model. **E2**
- `.github/workflows/codeql.yml` — SAST. **E1**
- `.github/dependabot.yml` — dependency management. **E1**
- responsible/vulnerability disclosure surfaces under Trust Center. **E1/E2**
- `docs/trust/ISO27001_SOC2_READINESS.md` — vulnerability evidence requirements. **E2**

### Open evidence
Independent penetration testing/external security review is not treated as complete unless an actual third-party report/retest is present and scoped to the relevant release.

### Submission posture
**AMBER.**

---

## UEM — Universal Endpoint Management

### Evidence search result
No sufficiently clear evidence was identified for a company-wide endpoint MDM/EDR/device-compliance programme.

### Submission posture
**AMBER / NA / NO.** For a hosted SaaS Application Provider, some UEM responsibilities may be organizational or customer-side, but inapplicability must be justified control-by-control.

---

# Critical truthfulness blockers

These items do **not** prevent preparation of a Level 1 self-assessment, but they prevent unsupported `Yes` answers:

1. Independent assessment / external pentest evidence where independence is explicitly required.
2. Accepted restore drill and measured RTO/RPO where operational continuity proof is required.
3. Final provider/subprocessor/DPA reconciliation where contractual/provider evidence is required.
4. Formal HR/security-training evidence where personnel controls are required.
5. Company endpoint/MDM/EDR evidence where endpoint controls apply.
6. Provider-issued evidence for inherited datacenter, infrastructure, encryption and model controls.
7. Exact production configuration/runtime evidence for controls whose implementation depends on protected configuration.

# Next mapping rule

Once the official AI-CAIQ v1.1.0 question set is available, each question must link to one or more evidence entries in this index. No question text or control ID is to be fabricated before retrieval of the official template/API data.
