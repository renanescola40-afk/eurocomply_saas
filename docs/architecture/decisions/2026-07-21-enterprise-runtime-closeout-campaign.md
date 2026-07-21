# ADR: Enterprise runtime closeout campaign

Date: 2026-07-21
Status: Proposed

## Context

The repository has many protected runtime-proof workflows covering identity, tenancy, platform providers, data governance, incident response, procurement, recovery, production and step-up authentication. Running them independently creates operational drag, inconsistent provenance and a high risk of mixing artifacts from different commits.

The official enterprise score remains evidence-backed and must not increase merely because implementation exists.

## Decision

Add one protected campaign workflow that:

1. accepts only a full current `main` SHA;
2. requires explicit operator confirmation;
3. dispatches ten existing proof workflows rather than duplicating their domain logic;
4. waits for each exact-SHA child run;
5. downloads artifacts from the matching run;
6. produces a bounded campaign summary;
7. fails closed unless every required lane succeeds and publishes evidence.

The campaign is orchestration only. Domain validation remains owned by each child workflow, while final promotion remains owned by the enterprise release decision builder.

## Consequences

### Positive

- ten proof lanes can be launched as one controlled operation;
- all evidence is bound to one release SHA;
- missing configuration becomes an explicit lane blocker;
- runtime closeout becomes repeatable and auditable;
- existing workflow boundaries and protected environments remain intact.

### Trade-offs

- the campaign may run for several hours;
- GitHub Actions API availability becomes an orchestration dependency;
- child workflows must continue accepting `release_sha`;
- a successful child workflow with no artifact is treated as blocked;
- external review and legal validation remain separate human evidence.

## Rollback

Remove the campaign workflow, orchestrator, manifest, tests and documentation together. Existing domain workflows remain independently runnable, and enterprise release remains `NO_GO` until equivalent exact-SHA evidence is collected and accepted.
