# RISCK COMPLY — ISO/IEC 27001 and SOC 2 readiness

**Classification:** Internal, evidence-bound roadmap. Updated 2026-10-15.

**Current external assurance:** RISCK COMPLY is **not currently represented as ISO/IEC 27001 certified** and has **no issued SOC 2 Type I or Type II report** in the available evidence. Documentation, CI checks, tool reports, SOC 2 criteria mappings and Annex A inventory are **not** substitutes for independent assessment.

## Framework and distinction

| Objective | Available status | What proves completion |
| --- | --- | --- |
| ISO/IEC 27001:2022 ISMS | Initial controls, risk/security documents and a draft 93-control Annex A register exist; approved ISMS scope, systematic risk treatment, applicable controls and real operation not fully verified | Complete scoped ISMS, internally reviewed evidence and successful independent accredited certification audit |
| SOC 2 Type I | Draft design/evidence register, no issued independent examination | Management system description and suitable design evidence as of a selected date; independent examination/report |
| SOC 2 Type II | No issued independent examination or verified reporting period | Same properly defined system, plus actual operation and testing across an agreed examination period; independent report |

**Type I is not a 'certification'.** A Type II period cannot be generated retrospectively through templates, fabricated reviews or CI artifacts.

## Current bounded technical evidence

- Annex A register: 93/93 control identifiers inventoried and 93/93 applicability marked `NOT_ASSESSED` as of October 15. This is **inventory completeness**, not evidence coverage.
- Static security tests, PR review/release records and partial Supabase RLS catalog metadata exist. Live tenant isolation, privileged execution, data-access outcomes and review frequency require evidence tied to the exact deployed release.
- GitHub PRs #2462, #2467 and #2474 are merged. Merged code alone does not prove deployment or control operation.
- Read-only Vercel inspection on October 15 identified the production-target READY deployment `dpl_G46QK2En1purZiDjnDMamBjcWrEB` at SHA `3310757dc82c2f5b07a5763b2e4b6e9fc5b4bfc5`. The deployment's aliases include `www.risckcomply.com`; GitHub main was **103 commits ahead** of that SHA at inspection. Later production-target deployment attempts were **BLOCKED**. This comparison is a snapshot and must be refreshed at release.
- GitHub Actions checks on draft PR #2495 displayed pre-run failures with `runner_id=0` and `steps=[]` for sampled jobs. This is **unverified CI**, not proof of failing tests or a passing release.

## Priority audit domains

| Domain | Completion criteria |
| --- | --- |
| Leadership / scope | Authorized company entity, service/system boundaries, interested parties, subservice organizations and accountable security officers |
| ISMS risk | Approved risk analysis method, actual risk assessment, formal Statement of Applicability decisions, signed treatment acceptance |
| Identity / access | Joiner-mover-leaver workflow, MFA rules, privileged access review, role permissions and tenant A/B negative tests |
| Change control | Protected branch/ruleset proof, tested exact-SHA CI, review approval, release traceability, rollback and documented exceptions |
| Vulnerability | SAST/SCA results, triaged findings, remediation SLAs and independent pentest/retest evidence with accurate limitations |
| Incident response | Named incident commander, severity definitions, exercises, logs, containment and reviewed post-incident actions |
| Continuity | BIA, approved RTO/RPO targets, scoped restore tests, recovery proof and service-provider dependencies |
| Vendor / privacy | Vendor inventory, subprocessor agreements, data flow/residency, retention and deletion mechanisms, due diligence |
| Evidence operations | Approved evidence custodian, retention/access controls, actual review timestamps and independent management/internal-audit records |

For detailed gates see [closure-gate-register](../assurance/iso27001-soc2/closure-gate-register-2026-10-15.md) and [execution handoff](../assurance/iso27001-soc2/execution-handoff-and-evidence-protocol-2026-10-15.md).

## Next safe sequence

1. Validate and track Annex A register structure; reject unsupported claims. Run `node --test scripts/security/iso-soc2-register-audit.test.mjs` and `node scripts/security/iso-soc2-register-audit.mjs` in a reviewed environment.
2. Establish approved ISMS organization/scope and formal SOC 2 scope; select authorized accountable managers.
3. Produce justified applicability/risk decisions with named owners, not made-up statements of approval.
4. Collect real, timestamped operational evidence for access control, release management, observability, incident response, vendors and backup recovery.
5. Reconcile exact-SHA deployment, resolve runner pre-start issues without creating unapproved costs, and exercise isolated security tests without interacting with customer accounts or DataGuard demo.
6. Perform documented internal audit and management review with genuine independence and approval before seeking external assurance.
7. Engage accredited ISO certification and a qualified independent CPA/SOC 2 examiner only with explicit external-activity/cost approval.

## Communications and safety

**Approved claim:** "RISCK COMPLY is developing its ISO/IEC 27001:2022 and SOC 2 assurance program. It does not currently claim ISO 27001 certification or an issued SOC 2 report. Available technical and governance evidence can be supplied subject to confidentiality and scope review."

No emails are authorized by this workstream. No paid services, production writes, customer data changes, DataGuard demo interactions, credential disclosure or autonomous audit-signoff. Percentage of **overall audit readiness is NOT_YET_MEASURABLE** pending an approved scope/control population. Progress measured for individual inventory/testing tasks must never be displayed as a certification percentage.

**Normative references:** ISO/IEC 27001:2022 and applicable amendment; AICPA 2017 Trust Services Criteria (revised Points of Focus 2022); 2018 SOC 2 System Description Criteria (revised guidance 2022). Do not copy licensed standard text into this repository.
