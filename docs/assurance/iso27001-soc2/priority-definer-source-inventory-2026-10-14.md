# Priority SECURITY DEFINER inventory — 2026-10-14
Status: read-only initial source metadata triage; NOT verified safe code.

## Scope
54 public SECURITY DEFINER functions with 'public' in explicitly configured search_path.
- 50 plpgsql, 4 sql language (previous discovery)
- SQL definition text static screening: 0 of 54 contain regex whole-word EXECUTE; 1 of 54 mentions set_config.
- These are keyword screens, NOT evidence of absence of dynamic execution or security faults.
- Function names and signatures were retrieved for all 54; examples include organization invitations, onboarding, billing checkout, QMS, AI system creation, enterprise evidence packs and Article 50 assessments.
- All functions remain in scope for detailed human/automated review of source body and role/tenant authorization; detailed per-function verdicts: 0/54 at this checkpoint.

## Priority
P1: organization membership/invitation and role change, owner establishment, billing checkout/session binding and privileged data operations.
P2: audit/incident, QMS controls, AI evidence pack, regulatory assessment.
P3: read-only support routines, after access categorization.

## Measured completion / outstanding
Metadata inventory: 54/54 (100% completed, 0% remaining).
Per-function security verdict with tests: 0/54 (0% completed, 100% remaining) in this workstream.
ISO/SOC2 full readiness and remainder: NOT YET MEASURABLE.

## Required test method
Review schema names in search_path, qualifying all sensitive references, role EXECUTE grants, owner privileges, authorization context and transaction boundaries; validate using synthetic tenants in an isolated environment. NO production function invocation, no data mutation, no demo access, no emails.

## No-go
Do not change or deploy any of these functions to production while DataGuard demo is protected.
