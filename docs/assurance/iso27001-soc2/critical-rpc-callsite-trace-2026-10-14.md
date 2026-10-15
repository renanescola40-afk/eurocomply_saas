# Call-site authorization tracing — 2026-10-14
Status: STATIC SOURCE REVIEW — not a dynamic access-control test.
Source: GitHub main, 3 paths reviewed read-only. No production requests, no function execution.

## 1. create_organization_with_owner_atomic
Call-site: src/server/actions/organizations.ts
Observed: createOrganization calls requireCurrentUser(), validates with createOrganizationSchema.safeParse(), invokes distributed rate limiting and passes user ID into backend operation. Audit persistence is checked in the action. This reduces the initial risk from caller-supplied p_user_id, but actual rate-limit behavior and privilege chain are NOT tested.
**Email caution:** this file includes a sendEmail() call after organization creation. No function was invoked in this audit, so no message was sent. NO onboarding tests in production because they might trigger emails and affect demo safety.

## 2. change_organization_member_role_atomic
Call-site: src/app/api/team/members/role/route.ts
Observed: POST requires requireApiUser(), requireTrustedMutation() with team-management rate limiting, organization resolution, requirePermission(manage_team) and requireStepUpForRequest(manage_team). Backend RPC uses privileged client. No bypass verified. Must inspect all fail-closed branches, parameter binding, tests, and execution chain before passing the control.

## 3. create_enterprise_evidence_pack_atomic
Call-site: src/app/api/ai-systems/route.ts
Observed: createEvidencePackWorkflow accepts organizationId and actorUserId, uses createAdminClient(). Route also has requireApiUser(), getCurrentOrganizationForUser() and assertOrganizationPermission() in GET, and assertTrustedOrigin() + requireApiUser() at start of POST. **Not enough evidence in this pass to establish that the specific evidence-pack workflow invocation always follows a validated authorization check.** Requires full call-chain tracing.

## Progress (explicit narrow denominator)
Critical RPC call sites located and preliminarily inspected: 3/3 selected = 100%, 0% left in this selected sample.
Priority function call-site investigations across whole 54-function population: 3/54 = 5.56% addressed preliminarily, 51/54 (94.44%) remaining.
Fully tested effective authorization: 0/54 = 0%, 100% remaining.
ISO 27001 readiness: NOT YET MEASURABLE.
SOC 2 Type I/II readiness: NOT YET MEASURABLE.

## Next steps
1. Trace the evidence pack workflow's precise POST branch and asserted permission in full.
2. Inspect organization creation mail side-effects without invoking them.
3. Review release-grade tests and privileged client boundaries.
4. Validate with synthetic staging only, suppressing all outbound email and isolating the DataGuard workspace.
5. Begin separate organizational ISMS clauses 4–10 and SOC2 controls assessments.

No emails; no production writes; no DataGuard interaction; no Stripe changes; no certifications claimed.
