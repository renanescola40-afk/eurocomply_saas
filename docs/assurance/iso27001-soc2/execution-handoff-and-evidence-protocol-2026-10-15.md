# RISCK COMPLY — ISO 27001 / SOC 2 evidence-driven execution handoff

**Snapshot:** 2026-10-15. **Status:** INTERNAL DRAFT — NOT independently audited; not ISO-certified; no SOC 2 report or signed management approval.

## Audit perimeter requiring formal approval
- **Service candidate:** RISCK COMPLY SaaS, Next.js / Vercel, Supabase Auth/Postgres/Storage, Stripe, GitHub.
- **Legal organization:** corporate owner, facilities, staff/contractors, supplier boundaries and outsourced processing **must be approved by authorized management**. A commercial contracting company does not automatically define an approved ISMS scope.
- **SOC 2 category proposal:** Security / AICPA Common Criteria; whether Availability, Confidentiality, Privacy and Processing Integrity belong in scope must be determined from the actual commitments.
- No emails, customer/live-account changes, new costs, production deployment, or DataGuard demonstration interactions are part of this work.

## ISO/IEC 27001:2022 clauses 4–10 — acceptance register

| Clause | Required operating/approved evidence | Present status |
| --- | --- | --- |
| 4 Context | Interested parties, contractual/regulatory obligations, formal ISMS scope and exclusions | NOT_VERIFIED |
| 5 Leadership | Named accountable executive, signed policy, decision authorities | NOT_VERIFIED |
| 6 Planning | Risk methodology, risk inventory and treatment, objectives, approved Statement of Applicability (SoA) | NOT_VERIFIED |
| 7 Support | Competence, awareness, communication, controlled documents and evidence protection | NOT_VERIFIED |
| 8 Operation | Actual risk-assessment cycles, approved change history, security procedures in operation | NOT_VERIFIED |
| 9 Evaluation | Defined metrics, monitoring outcomes, internal audit and documented management review | NOT_VERIFIED |
| 10 Improvement | Tracked nonconformities, corrective actions and effectiveness verification | NOT_VERIFIED |

SoA must be justified from documented risk treatment, not created by marking all 93 controls as implemented. Treat clause evidence and Annex A as two distinct populations.

## SOC 2 — Security Common Criteria planning map

| Area | Evidence requirement for independent auditor | Present status |
| --- | --- | --- |
| CC1 Control Environment | Accountability, leadership and oversight | NOT_VERIFIED |
| CC2 Information & Communication | Approved reporting and communications processes | NOT_VERIFIED |
| CC3 Risk Assessment | Approved enterprise/security risk analysis | NOT_VERIFIED |
| CC4 Monitoring Activities | Monitoring reviews, findings, remediation | NOT_VERIFIED |
| CC5 Control Activities | Documented control designs and segregation of duties | NOT_VERIFIED |
| CC6 Logical & Physical Access | Access reviews, MFA, RLS effective behavior, tenant A/B negative tests, supplier physical boundaries | PARTIAL_STATIC_METADATA |
| CC7 System Operations | Incident exercises, logging, alert response, vulnerability/remediation records | NOT_VERIFIED |
| CC8 Change Management | Approval history, CI on exact released SHA, deployment and rollback records | PARTIAL_GITHUB_EVIDENCE |
| CC9 Risk Mitigation | Vendor due diligence, backup recovery, continuity, risk acceptance | NOT_VERIFIED |

**Type I** needs independent testing of control design at a specified date. **Type II** also requires genuine controls operating across an agreed review period; that period cannot be backfilled with fabricated events.

## Existing evidence and exact limits

1. `docs/assurance/iso27001-soc2/annex-a-control-register.csv`: **93/93 control IDs**, all **93/93 applicability = NOT_ASSESSED** as inspected 2026-10-15. This is **100% inventory**, **0% applicability review logged**, **0% independently verified evidence in this register** — not a claim that all controls are absent.
2. `scripts/security/iso-soc2-static-boundary.test.mjs`: static source assertions only, not live tenancy security.
3. GitHub PRs [#2462](https://github.com/renanescola40-afk/eurocomply_saas/pull/2462), [#2467](https://github.com/renanescola40-afk/eurocomply_saas/pull/2467) and [#2474](https://github.com/renanescola40-afk/eurocomply_saas/pull/2474) merged; they evidence change history, not production equivalence.
4. Prior Supabase read-only catalog inspected **115/115 RLS-enabled public tables**. Negative tenant, storage, privileged-function grants and schema-wide effective access remain distinct proofs.
5. Vercel capture 2026-10-15: production-target READY deployment `dpl_G46QK2En1purZiDjnDMamBjcWrEB`, SHA `3310757dc82c2f5b07a5763b2e4b6e9fc5b4bfc5`, alias list includes `www.risckcomply.com` and `risckcomply.com`. At inspection, GitHub main was **103 commits ahead** of that deployed SHA. Newer production-target attempts were BLOCKED. Neither READY nor alias metadata proves end-user functionality, security or auditor acceptance.
6. CI / DAST green observations were tied to earlier SHA snapshots. Exact-SHA production equivalence and control operations need separate verification.

## Operational evidence collection protocol
For each applicable requirement, capture: framework/control ID, risk, system and scope, assigned owner, approved policy/version, control frequency, real execution timestamp (UTC), signed reviewer, original evidence URI/hash, exception and remediation history, retest and control design/operation acceptance. Keep logs, credentials, personal data and sensitive auditor materials in restricted evidence storage, **never in public source or ordinary committed plaintext**. Do not backdate human reviews.

**Suggested future cadence, not retroactive proof:** evidence at every authorized release and security event; regular access, risk and vendor reviews at risk-appropriate frequency; periodic restore and incident exercises; periodic internal audit and management review. Frequency and auditors must be formally designated before a Type II period is defined.

## Manager-controlled decisions blocking final external assurance
1. Approve legal ISMS boundary, business sponsor, geographic and outsourced scope.
2. Approve category-specific SOC 2 perimeter and security/availability commitments.
3. Nominate risk owners, system and privacy owners, approvers, and an independent internal reviewer.
4. Approve risk appetite, applicable ISO clauses, risk-treatment policy and a reasoned SoA.
5. Designate restricted, tamper-evident evidence retention, access and collection procedure.
6. Authorize isolated synthetic A/B tenant testing and exact-SHA release reconciliation without harming DataGuard.
7. Authorize cost and independent ISO certification body / SOC 2 CPA auditor separately before external engagement.

## Closure status
G01–G03 and G06–G11 remain NOT_VERIFIED / NOT_STARTED; G04–G05 remain PARTIAL_METADATA / PARTIAL_REPOSITORY_EVIDENCE. Overall **ISO 27001 and SOC 2 Type I/II readiness percentages = NOT_YET_MEASURABLE**, pending approved scope and operating-control assessment.

**Source standards:** ISO/IEC 27001:2022 (including applicable Amd 1:2024), ISO SC27 auditing guidance for Annex A and SoA; AICPA SOC 2 Trust Services Criteria and system description guidance. This document is a work plan, not a standards-text reproduction or an auditor report.
