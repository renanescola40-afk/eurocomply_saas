# Enterprise Runtime Evidence Closeout

## Purpose

Produce one immutable, exact-SHA runtime evidence bundle for the final production and Enterprise GO decision.

This workflow consolidates existing production checks. It does not replace their underlying validation logic and does not convert repository CI into runtime proof.

## Protected environment

Create the GitHub environment:

`enterprise-production-closeout`

Require at least one independent environment approver. Configure only production-scoped values required by the existing validators:

- `PRODUCTION_URL`;
- protected readiness token;
- Supabase URL and test credentials for two isolated tenants;
- Sentry organization, project and auth token when observability validation requires them.

Do not expose secrets in workflow logs, artifacts, issue comments or pull requests.

## Execution sequence

1. Confirm the intended release SHA is the exact current `main` SHA and is deployed to the production hostname.
2. Confirm migration reconciliation and the migration release control plane are complete for the same SHA.
3. Run **Enterprise Runtime Evidence Closeout** manually with the full 40-character SHA.
4. Approve the protected environment only after confirming the target hostname and Supabase project.
5. The workflow executes:
   - public production final validation;
   - live Supabase RLS and cross-tenant isolation validation;
   - authenticated production smoke;
   - production observability validation;
   - common GitHub Actions provenance stamping;
   - consolidated fail-closed validation.
6. Retain the 90-day artifact `enterprise-runtime-closeout-<sha>`.

## Acceptance

The consolidated result is accepted only when all six evidence documents:

- exist and parse as JSON;
- report `status: Complete`;
- report `outcome: passed`;
- reference the exact requested SHA;
- include workflow run ID and URL;
- have distinct content digests.

The accepted artifact still does not independently grant Enterprise GO. Legal reviews, external approvals, migration execution attestations, provider configuration and other owner-controlled blockers remain separate.

## Failure handling

- Never manually edit a failed evidence file to make it pass.
- Fix the underlying runtime or validator failure and rerun against a fresh exact current-main SHA.
- A new commit invalidates the previous closeout bundle for release credit.
- Missing production credentials or environment approval is `BLOCKED`, not `PASS`.

## Issue linkage

After an accepted run, record the workflow URL, artifact name, release SHA and consolidated digest in:

- #198 for Supabase live RLS;
- #778 for public production runtime closure;
- #1032 for the Enterprise GO evidence index.
