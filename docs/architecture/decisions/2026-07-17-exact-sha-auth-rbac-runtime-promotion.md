# Promote Auth/RBAC controls only from protected exact-SHA runtime evidence

- **Date:** 2026-07-17
- **Status:** Proposed
- **Scope:** IAM-02, IAM-03, IAM-04 and IAM-06

## Context

The repository already contains a protected Supabase Auth/RBAC runtime proof using three synthetic identities and two isolated organizations. It validates password login, session refresh, logout, owner/member role observation, same-tenant reads and cross-tenant denial without using the service-role key.

The proof was manual-dispatch only and the Enterprise Readiness Scorecard did not retrieve its artifact. As a result, the scorecard correctly reported the canonical `auth-rbac-validation.json` evidence as missing even when the underlying implementation and runtime probe existed.

Signup, OAuth callback and organization onboarding require separate disposable-flow proofs and must not be inferred from password-login or tenant-read results.

## Decision

1. Run `Auth RBAC Tenant Proof` automatically for every current `main` SHA while preserving protected `production` environment approval and secrets.
2. Require the checked-out SHA to equal the current GitHub `main` SHA, including manual dispatches.
3. Trigger the scorecard after a successful Auth/RBAC proof and retrieve only the successful, non-expired artifact for the exact assessed SHA.
4. Validate repository, workflow, branch, run ID, SHA, complete checks, empty failures and redaction before copying evidence into the scorecard workspace.
5. Re-derive the canonical scorecard evidence locally from the validated source artifact.
6. Promote only `login`, `logout`, `sessionRefresh` and `rbac`. Keep `signup`, `oauthCallback` and `organizationOnboarding` explicitly `NOT_VERIFIED`.

## Security and privacy consequences

- No browser token, password, cookie, user identifier, organization identifier or raw provider response is retained.
- The scorecard cannot reuse a stale artifact, a feature-branch run, a failed run, a manual document or a run for another SHA.
- Missing fixture secrets, environment approval, provider availability or any failed runtime assertion keeps the controls open.
- Workflow permissions remain read-only and no `pull_request_target` execution is introduced.

## Expected score effect

The pull request itself must remain at the current official Enterprise Readiness score because protected production runtime evidence is unavailable on an unmerged feature branch.

After merge, a successful exact-main-SHA Auth/RBAC workflow and a successful scorecard rerun may promote four controls, moving the evidence-backed score by at most four percentage points. The score must not increase when secrets are missing, approval is withheld, Supabase is unavailable or the artifact fails provenance validation.

## Evidence boundary

This proves the configured synthetic password-authentication and tenant-authorization scenario at one point in time. It does not prove signup, email confirmation, OAuth provider round trips, administrator MFA, SSO, every application permission, customer data correctness or provider SLA.

## Rollback

Revert the workflow automation, artifact fetcher, scorecard integration, tests and this decision record. Remove any Auth/RBAC scorecard evidence generated from the reverted automation and return the mapped controls to `NOT_VERIFIED` unless another accepted exact-SHA proof exists.
