# Bounded GitHub checks pagination

Date: 2026-08-05

Status: Accepted

## Context

The Enterprise Readiness Scorecard collects GitHub Actions results for one
exact assessed SHA. As the repository accumulated more workflows, the generic
workflow-runs endpoint returned more than 1 MiB even when filtered by SHA. The
collector correctly rejected that response, but the scorecard could no longer
reach evidence generation.

The investigation also found that `Dependency Review` ran only for pull
requests while the collector requires it for an exact `main` SHA. A merge SHA
could therefore never have that workflow result.

The 1 MiB response boundary is a security and availability control. Increasing
or removing it would make the collector consume an unbounded remote response
and would hide the actual API-query scalability problem.

## Decision

Workflow-run collection uses pages of 20 entries, asks GitHub to omit expanded
pull-request data, and reads at most ten pages. Collection stops earlier when
all required workflows have been observed or the API reports that all results
have been consumed.

The collector still:

- accepts only runs whose `head_sha` equals the assessed SHA;
- selects the newest observed run for each workflow;
- keeps the 1 MiB limit for every individual API response;
- reports missing workflows as `NOT_VERIFIED`;
- never converts truncated or unavailable evidence into `PASS`.

## Consequences

The scorecard can inspect up to 200 compact exact-SHA runs without accepting an
oversized response. If a future SHA produces more than 200 runs and a required
workflow is not present in that bounded window, the outcome remains
fail-closed and the page budget must be reviewed deliberately.

`Dependency Review` now also runs on pushes to `main`. Its GitHub dependency
graph comparison remains pull-request-only because it needs PR base/head
semantics. On `main`, the workflow still produces exact-SHA evidence and runs
the deterministic vulnerability policy gate whenever dependency manifests
changed in the merge commit.

This change repairs evidence collection only. It does not prove production
deployment, provider health, runtime security, tenant isolation, or Enterprise
readiness by itself.
