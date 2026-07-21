# Enterprise End-to-End Promotion Closeout

## Objective

Run the protected runtime campaign, collect scorecard-readable evidence from all ten required lanes, preserve the exact current `main` SHA, regenerate the canonical 100-control baseline and calculate the evidence-backed completion and remaining percentages in one retained closeout bundle.

## Why this exists

The repository previously contained three valid but disconnected stages:

1. protected runtime campaign and artifact collection;
2. exact-SHA evidence-manifest assembly;
3. canonical scorecard promotion.

A successful campaign alone did not calculate progress. The standalone manifest workflow did not download campaign artifacts into its workspace, and the standalone promotion workflow expected scorecard and manifest files that were not materialized automatically. This closeout joins those stages without weakening any gate.

## Protected procedure

1. Merge every intended implementation PR.
2. Copy the full lowercase SHA currently at `main`.
3. Open **Actions → Enterprise Runtime Closeout**.
4. Enter the exact SHA.
5. Enter `RUN_ENTERPRISE_RUNTIME_CLOSEOUT`.
6. Obtain approval for the `production-enterprise-closeout` environment.
7. Allow the ten child workflows to finish.
8. Download `enterprise-runtime-closeout-<sha>` after the parent finishes.
9. Review `artifacts/enterprise-readiness/enterprise-promotion-closeout.json` first.
10. Review the manifest and detailed scorecard-promotion report before accepting any percentage change.

## Required lanes

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

Every lane must complete successfully, retain at least one artifact and expose at least one sanitized scorecard-readable JSON document. The evidence document must bind `targetSha` and `observedSha` to the exact release SHA, bind its run ID to the child workflow run, declare `Complete/passed`, identify canonical controls and explicitly assert that it contains no sensitive values.

## Evidence flow

The closeout performs these stages:

1. capture exact-SHA GitHub checks;
2. generate the canonical baseline scorecard from the versioned 100-control model;
3. create baseline evidence only for controls already reported `PASS` by that exact-SHA scorecard;
4. select and sanitize eligible evidence from every runtime lane;
5. build the deterministic evidence manifest;
6. promote controls using the canonical promotion engine;
7. write the previous percentage, promoted percentage, delta, remaining percentage, critical-open controls and final `GO/NO_GO` decision.

## Fail-closed conditions

The closeout remains `NO_GO` when any of the following occurs:

- requested SHA is not current `main`;
- a child workflow fails, times out or produces no artifact;
- a runtime lane has no scorecard-readable evidence;
- child run ID, repository or SHA provenance does not match;
- evidence is malformed, oversized, duplicate or secret-shaped;
- the canonical baseline is not exactly 100 controls;
- a previous `PASS` lacks eligible exact-SHA evidence;
- any critical control remains open;
- the promoted score is below 100%.

Do not convert the final closeout step to advisory and do not dismiss rejected evidence merely to obtain a green workflow.

## Outputs

The retained bundle contains:

- `artifacts/enterprise-runtime-campaign.json`;
- `artifacts/runtime-evidence/`;
- `artifacts/enterprise-readiness/github-checks-evidence.json`;
- `artifacts/enterprise-readiness/canonical-scorecard.json`;
- `artifacts/enterprise-readiness/canonical-scorecard.md`;
- `artifacts/enterprise-readiness/evidence-manifest.json`;
- `artifacts/enterprise-readiness/scorecard-promotion-report.json`;
- `artifacts/enterprise-readiness/enterprise-promotion-closeout.json`.

The closeout report is the first place to read the newly calculated completion and remaining percentages. Repository documentation must not be manually increased without accepting this exact-SHA retained evidence.

## Human and external boundary

Code cannot self-prove independent penetration testing, external architecture review, legal approval, customer IdP interoperability, operator acceptance or regulator acceptance. Those controls remain open until independently produced evidence is present and accepted by the same fail-closed pipeline.

## Rollback

This package does not merge, deploy, mutate production data or execute destructive database rollback. Revert the workflow integration, closeout scripts, tests and this runbook together. Existing domain workflows remain independently runnable, and historical evidence artifacts must remain immutable.
