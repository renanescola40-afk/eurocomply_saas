# Safe Runtime Bootstrap Runbook

## Purpose

Generate and promote non-destructive enterprise runtime evidence for the exact current `main` SHA. This workflow is a progress accelerator, not a release approval.

## Automatic execution

`Enterprise Safe Runtime Bootstrap` starts after `Full Security Suite` completes successfully on `main`.

The bootstrap:

1. verifies the triggering SHA is still current `main`;
2. selects the `safe` campaign profile;
3. reuses exact-SHA push or dispatch runs that are queued, running or successful;
4. dispatches missing lanes and re-dispatches completed failed lanes;
5. waits for all safe lanes;
6. downloads and validates retained artifacts;
7. generates a fresh canonical baseline scorecard;
8. promotes only accepted safe-lane evidence;
9. uploads the campaign, normalized evidence, manifest and promotion reports.

## Manual execution

Use workflow dispatch only when an automatic run was cancelled or when an environment approval was completed after the original run.

Provide:

- the full current `main` SHA;
- confirmation `RUN_SAFE_RUNTIME_BOOTSTRAP`.

Never use a stale SHA. The workflow fails closed if `main` advances.

## Included lanes

- IAM-RBAC
- IAM-LIFECYCLE
- TEN-RLS
- FINAL-TECHNICAL
- PLATFORM
- DATA
- INCIDENT
- TRUST
- PRODUCTION
- REPOSITORY
- STEP-UP

## Excluded lanes

- `RECOVERY`: requires explicit authorization for controlled production rollback;
- `ASSURANCE`: requires real independent security, legal, release and edge-provider evidence.

`REL-10` is also excluded from safe promotion and remains blocked until a full 99-control preliminary promotion succeeds with zero rejected evidence.

## Required result

The retained `safe-promotion-closeout.json` must show:

- `profile: safe`;
- `runtimeCampaignDecision: READY_FOR_SAFE_PROMOTION`;
- `evidenceManifestDecision: READY_FOR_PROMOTION`;
- `closeoutDecision: SAFE_EVIDENCE_PROMOTED`;
- `coherencePromoted: false`;
- `rejectedEvidence: 0`;
- promoted completion greater than or equal to baseline completion.

A `NO_GO` release decision is expected until recovery and assurance are completed.

## Failure handling

Inspect `enterprise-safe-runtime-campaign.json` for the blocked lane and its sanitized reason. Correct the relevant environment variable, secret, provider fixture or protected-environment approval, then manually rerun the bootstrap for the same current `main` SHA.

Do not bypass a failed lane, edit the retained report or count a workflow as evidence without a complete/passed exact-SHA artifact.
