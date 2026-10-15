# CI jobs fail before runner allocation — evidence checkpoint

**Date:** 2026-10-15 UTC  
**Scope:** Draft PR [#2495](https://github.com/renanescola40-afk/eurocomply_saas/pull/2495), head SHA originally `1286784cfd6fc42c66f90d409b15a325ce276e80`  
**Classification:** Technical evidence, **root cause UNCONFIRMED**. Does not constitute an application/test finding.

## Read-only evidence from GitHub API

| Observed item | Value |
| --- | --- |
| CI workflow run | [38812947519](https://github.com/renanescola40-afk/eurocomply_saas/actions/runs/38812947519) |
| CI job | `116690449885` (`quality`) |
| Event | `pull_request` |
| Job created / started | 2026-10-15T21:51:05Z |
| Job completed | 2026-10-15T21:51:07Z |
| Conclusion | `failure` |
| Runner | `runner_id=0`; empty runner name |
| Steps | `[]` |
| Logs retrieval | BlobNotFound (HTTP 404) |
| Separate affected jobs | Claims `116690448822`, Enterprise DAST `116690449051`, and additional workflows showed similarly empty steps |

GitHub's check-runs response showed dozens of failed checks and related skipped gates. **These checks did not execute the application tests.** Independent local equivalent test fixtures reported 12/12 successes for the ISO Annex A integrity validator; they are not an attestation of GitHub CI or comprehensive repo tests.

## Triage without new expenses or bypasses

1. Record the pre-job signature; classify CI as **NOT_VALIDATED** rather than treating the application code as either secure or broken.
2. Check official GitHub Actions status and workflow settings; verify whether runners are available for this private repository.
3. The repository owner must independently review GitHub **Settings → Billing and licensing** and existing Actions minutes/usage/storage and spending limits. This is **read-only**; it does not require changing a budget, credit card or purchasing extra minutes.
4. Review current account notices / job summary for failed billing, usage caps, platform incident, or access restrictions. Without a concrete error, do not assert billing as root cause.
5. When free capacity and runner launch are confirmed, rerun only the appropriate reviewed exact-SHA workflows under authorized cost controls. Confirm non-empty steps, successful exit codes and artifacts.
6. Keep merge/deploy blocked pending all required gates and a DataGuard-safe release review. Never mark failure as waived to claim ISO 27001 or SOC 2 control operation.

## Closure criterion

**PASS** only when the intended fixed SHA executes its required CI and security jobs on real runners, produces authentic logs/artifacts with successful gate outcomes, and the production release is separately approved/tested. At this snapshot: **BLOCKED_PRE_RUN**, root cause unknown.

No emails sent, no costs authorized, no production or DataGuard operations performed by this CI observation.
