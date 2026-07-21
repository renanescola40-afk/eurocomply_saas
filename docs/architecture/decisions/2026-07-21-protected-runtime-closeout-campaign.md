# ADR: Protected exact-SHA runtime closeout campaign

- Status: Accepted
- Date: 2026-07-21

## Context

The canonical enterprise scorecard reports 46% with 48 critical controls open. Many remaining controls already have dedicated protected proof workflows, but executing them individually creates operator delay, inconsistent target SHAs and fragmented evidence campaigns.

A single workflow must not manufacture evidence or replace specialized validations. It should only orchestrate the existing fail-closed proofs against one exact current `main` SHA.

## Decision

Add a protected manual campaign that:

- requires a full 40-character current `main` SHA;
- checks out and verifies that exact SHA;
- requires the `enterprise-release-approval` environment;
- uses only `actions: write` and `contents: read` permissions;
- dispatches the existing Auth/RBAC, Supabase RLS, distributed rate-limit, production runtime and branch-protection workflows;
- keeps migration application explicit and disabled by default;
- emits a redacted dispatch receipt;
- states that dispatch acceptance does not promote controls.

The specialized child workflows and canonical scorecard remain the evidence and promotion authorities.

## Consequences

### Positive

- One operator action starts a wave covering 22 critical controls.
- Every proof receives the same exact SHA.
- Existing protected environments, secrets, retry policies and artifact contracts are reused.
- Evidence integrity and fail-closed behavior are preserved.

### Risks

- GitHub environment or secret configuration can still block child workflows.
- Dispatch success does not guarantee proof success.
- Production deployment propagation may delay runtime proof convergence.
- Branch protection may require administrator evidence unavailable to code.

## Rejected alternatives

- Marking controls PASS from repository implementation: rejected because it lacks runtime evidence.
- Combining provider secrets and all validation logic into one new workflow: rejected because it duplicates mature proof workflows and expands blast radius.
- Automatically applying RLS migrations: rejected because database changes require an explicit operator decision.
- Weakening protected environments or required checks: rejected because speed cannot come from bypassing release governance.
