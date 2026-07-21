# Safe Runtime Bootstrap Runbook

## Purpose

Generate and promote non-destructive enterprise runtime evidence for the exact current `main` SHA. This workflow is a progress accelerator, not a release approval.

The safe bootstrap is incremental. A blocked provider, secret or protected-environment approval cannot discard valid evidence from another completed safe lane.

## Automatic execution

`Enterprise Safe Runtime Bootstrap` starts after `Full Security Suite` completes successfully on `main`.

The bootstrap:

1. verifies the triggering SHA is still current `main`;
2. selects the `safe` campaign profile;
3. reuses exact-SHA push or dispatch runs that are queued, running or successful;
4. dispatches every missing safe lane before waiting, so the non-destructive lanes execute concurrently;
5. waits independently for every safe lane and records complete or blocked state;
6. downloads and validates retained artifacts only from completed/successful lanes;
7. generates a fresh canonical baseline scorecard;
8. promotes only accepted exact-SHA evidence from completed safe lanes;
9. leaves every blocked lane and its controls open;
10. uploads the campaign, normalized evidence, manifest and promotion reports.

The protected full closeout remains all-or-nothing. Incremental behavior applies only to the `safe` profile.

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

## Complete safe result

When every safe lane completes, retained `safe-promotion-closeout.json` must show:

- `profile: safe`;
- `runtimeCampaignDecision: READY_FOR_SAFE_PROMOTION`;
- `evidenceManifestDecision: READY_FOR_PROMOTION`;
- `closeoutDecision: SAFE_EVIDENCE_PROMOTED`;
- `promotedLaneCount: 11`;
- `blockedLaneCount: 0`;
- `coherencePromoted: false`;
- `rejectedEvidence: 0`;
- promoted completion greater than or equal to baseline completion.

## Incremental safe result

When at least one safe lane completes and another remains blocked, retained `safe-promotion-closeout.json` must show:

- `runtimeCampaignDecision: READY_FOR_PARTIAL_SAFE_PROMOTION`;
- `closeoutDecision: PARTIAL_SAFE_EVIDENCE_PROMOTED`;
- `promotedLaneCount` greater than zero and below 11;
- `blockedLaneCount` greater than zero;
- `promotedLanes` containing only completed safe lanes;
- `blockedLanes` containing only incomplete safe lanes;
- no `RECOVERY` or `ASSURANCE` lane in either list;
- `coherencePromoted: false`;
- `rejectedEvidence: 0`.

A `NO_GO` release decision remains expected until Recovery, independent Assurance and final coherence are completed.

## Failure handling

Inspect `enterprise-safe-runtime-campaign.json` and `safe-promotion-closeout.json` for blocked lanes and sanitized reasons. Correct the relevant environment variable, secret, provider fixture or protected-environment approval, then manually rerun the bootstrap for the same current `main` SHA.

A rerun reuses retained successful exact-SHA lanes and retries only missing or failed work. It does not erase previously valid evidence.

Do not edit a retained report, synthesize evidence, count a workflow without a complete/passed exact-SHA artifact, or infer that a blocked lane passed because another lane was promoted.
