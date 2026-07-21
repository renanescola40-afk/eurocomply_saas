# Enterprise Runtime Closeout Runbook

## Goal

Execute the ten principal protected runtime-proof lanes against one exact current `main` SHA and collect their evidence in one retained campaign artifact.

## Preconditions

- Merge all intended implementation PRs first.
- Confirm every child workflow exists and accepts the `release_sha` input.
- Configure the protected environments and secrets required by each child workflow.
- Configure `production-enterprise-closeout` with required reviewers.
- Do not run against a feature branch, preview SHA or unreviewed deployment.

## Procedure

1. Copy the current full 40-character `main` SHA.
2. Open **Actions → Enterprise Runtime Closeout → Run workflow**.
3. Enter the SHA.
4. Enter `RUN_ENTERPRISE_RUNTIME_CLOSEOUT` exactly.
5. Approve the protected environment when the release owner and security reviewer agree to proceed.
6. Follow the parent run. It will dispatch each child workflow sequentially.
7. Review `enterprise-runtime-closeout-<sha>` after completion.
8. For every blocked lane, inspect the corresponding child run and correct configuration or implementation failures.
9. Rerun the complete campaign on the new exact `main` SHA after any repository change.
10. Run the canonical enterprise release decision only after the campaign reports `READY_FOR_EVIDENCE_PROMOTION`.

## Expected lanes

- Auth/RBAC and tenant isolation;
- identity lifecycle;
- live Supabase RLS;
- platform providers and revenue;
- data governance;
- incident and continuity;
- procurement and trust;
- recovery and resilience;
- production runtime;
- step-up authentication.

## Failure handling

- `workflow_*`: open the child run and use its lane-specific runbook.
- `missing_artifact`: the child workflow passed without publishing evidence; treat this as a control failure.
- timeout: verify Actions capacity, environment approvals and provider availability.
- dispatch/API error: verify the parent workflow has `actions: write` and GitHub Actions is available.
- SHA mismatch: stop. Refresh `main`, merge required changes and start a new campaign.

## Rollback and safety

The campaign does not deploy, merge or change branch protection by itself. Any destructive operation remains controlled by its child workflow and protected environment. Never weaken a child gate to make the campaign green.
