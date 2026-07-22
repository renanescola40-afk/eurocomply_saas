# EU AI Act Safe Runtime Promotion Runbook

## Purpose

Convert already-tested product workflows into retained exact-SHA runtime evidence without touching production or committing generated evidence into the repository.

## Automatic execution

The `EU AI Act Safe Runtime Promotion` workflow runs on pull requests and pushes to `main` when product, tests, compliance scripts or the workflow itself change.

## What it proves

The workflow executes isolated contract suites for:

- scope and classification;
- prohibited practices;
- AI literacy;
- Article 50 transparency;
- FRIA;
- deployer obligations;
- high-risk provider controls;
- Annex IV;
- QMS;
- conformity lifecycle;
- post-market and incidents;
- GPAI.

It then creates one canonical evidence document per workstream and recalculates product coverage using the artifact directory as an evidence overlay.

## Acceptance checks

A document is accepted only when it has:

- canonical schema and repository;
- exact assessed commit SHA;
- terminal `VERIFIED` status;
- synthetic-data declaration;
- explicit limitations;
- no customer data or credentials.

## Expected result

Implementation and CI coverage must remain at 100%. Safe runtime coverage must be at least 80% but remain below 100%. Final decision must remain `EU_AI_ACT_PRODUCT_COVERAGE_NO_GO` until production/provider proofs and qualified reviews are accepted.

## Artifact

`eu-ai-act-safe-runtime-promotion-<full-sha>` retains:

- the twelve evidence documents;
- promoted product coverage JSON;
- promoted product coverage Markdown.

Retention is 90 days.

## Remaining after a successful safe run

The safe lane intentionally leaves open:

- production/provider-specific runtime evidence;
- branch protection and release evidence where applicable;
- readiness scorecard coherence;
- vendor/provider failure proof;
- qualified legal and methodology reviews;
- Enterprise Recovery and external assurance.

## Failure handling

Do not weaken the score threshold or remove exact-SHA validation. Fix the failing contract, stale evidence, malformed JSON or workflow pin and rerun the same SHA.
