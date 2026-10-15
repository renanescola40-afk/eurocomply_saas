# RISCK COMPLY — ISO 27001 / SOC 2 evidence-driven closure gates
Date: 2026-10-15
Classification: INTERNAL DRAFT. No certification, SOC 2 opinion, or management approval implied.

## Purpose
Replace superficial documentation or inventory percentages with closure criteria that can be independently verified. This file is a task tracker, not an attestation.

## Gate matrix

| ID | Gate | Closure requires | Current status |
|---|---|---|---|
| G01 | Legal entity and security program scope | Management-approved entity, locations, systems, service boundaries, subservice organizations and exclusions | NOT_VERIFIED |
| G02 | ISO clauses 4–10 | Approved context, leadership, objectives, risk methodology, risk treatment, SoA, competence, operations, internal audit, review and corrective actions | NOT_VERIFIED |
| G03 | Annex A | 93 control applicability decisions with SoA justifications, named owners and evidence for applicable controls | NOT_VERIFIED |
| G04 | Identity, access and tenancy | Role/permission inventory, negative tenant tests, production configuration evidence, privileged call-site validation | PARTIAL_METADATA |
| G05 | Secure development | Branch protections, PR review evidence, CI runs, dependency scanning, change approval and release evidence | NOT_VERIFIED |
| G06 | Monitoring and incident response | Logs, incident drills, incident ownership, retention and reviewed alerts | NOT_VERIFIED |
| G07 | Business continuity | Approved BIA, RTO/RPO, restore test, recovery exercise and vendor dependencies | NOT_VERIFIED |
| G08 | Vendor and data governance | Vendor inventory, contractual responsibilities, processors, data flows, retention and assessments | NOT_VERIFIED |
| G09 | SOC 2 criteria and system description | Complete scoped criteria mapping, description, control frequency, ownership and as-of evidence | NOT_VERIFIED |
| G10 | SOC 2 Type II period | Real operating evidence over auditor-agreed period and exception tracking | NOT_VERIFIED |
| G11 | External assurance | Accredited ISO 27001 certification audit and independent SOC 2 examination, separately contracted | NOT_STARTED |

## 2026-10-15 scoped evidence update (proposed; PR review pending)

The G04 and G05 gate statuses above **remain open**. This is scoped technical evidence, not completion of whole audit criteria.

- **G04 — direct unprivileged grants:** Production read-only inventory observed 115/115 public tables with RLS and FORCE RLS, 33 public tables lacking explicit policies with **0 direct anon/authenticated grants across 264 table-role-operation combinations**, and 126 public SECURITY DEFINER functions with **0 direct EXECUTE grants across 252 function-role combinations**. Bypassing roles, service-role call sites, view exposure and synthetic A/B runtime authorization are outside this scoped result. [Evidence](g04-production-privilege-snapshot-2026-10-15.md).
- **G04 — Auth configuration:** Supabase advisor reported leaked-password protection disabled (WARN). Configuration remediation and real sign-in behavior remain open.
- **G05 — Annex A integrity gate:** Existing Node suite has 12 tests and had a local **12/12 PASS**; `npm test` is Vitest and did not automatically run it. The pending PR integrates the Node suite and register validator into both existing CI workflows. This is **CODE_ADDED, CI_NOT_VERIFIED**, not an operating development control PASS.
- **G05 — runner issue:** GitHub Actions jobs on the examined SHAs repeatedly failed before runner allocation (`runner_id=0`, no steps). No root cause or cost change established. Do not disable required checks or treat workflows as passed to force a release.

These findings do not change the overall `NOT_YET_MEASURABLE` ISO / SOC 2 audit-readiness state.

## Progress computation policy
- Gate discovery/inventory status must never count as closure.
- Overall readiness percentage is NOT_YET_MEASURABLE until the scope and population of applicable requirements is approved.
- For each selected gate, track PASS/FAIL/PARTIAL/NOT_TESTED/N_A_WITH_JUSTIFICATION and attached immutable evidence.
- Never backdate activities or create synthetic human approvals.

## First work items
1. Review static guard test and get CI or isolated test run evidence.
2. Check whether GitHub PR #2462 is merged and reconcile main SHA to deployed SHA.
3. Review Supabase security advisor findings with intended deny-by-default table posture.
4. Trace privileged service-role usage and negative isolation tests with synthetic accounts in a separate environment.
5. Nominate management owner for ISMS scope and risk acceptance.
6. Assemble SOC 2 control design and operating evidence matrix.

## Safeguards
No emails may be sent, replied to, forwarded, scheduled or triggered by testing without user-specific approval.
Avoid touching DataGuard demo accounts and records. No destructive customer/production operations.
Changes to shared production infrastructure require demonstrably safe change control; no direct production modifications from this evidence plan.
Costs and third-party engagements require explicit price review and approval.
