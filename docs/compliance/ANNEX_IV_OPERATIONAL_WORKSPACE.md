# Annex IV Operational Workspace

## Purpose

The workspace at `/{locale}/dashboard/annex-iv` turns the governed Annex IV domain into a tenant-scoped customer workflow for authoring, evidence preparation, independent review and package approval.

It supports technical-documentation readiness. It does not validate technical truth, perform an official conformity assessment, certify an AI system, authorize CE marking or replace legal, engineering or notified-body review.

## Workflow

1. Create a versioned package for an AI-system reference and system version.
2. The database creates all twelve Annex IV sections in the same transaction.
3. Author each section with a substantive summary and controlled source version.
4. Assign an independent reviewer and a SHA-256 content digest.
5. Attach organization-scoped evidence to each section.
6. Resolve all high and critical findings.
7. Approve the package only after all twelve sections are independently reviewed and evidence complete.

## API

- `GET /api/ai-governance/annex-iv`
- `POST ...?workflow=package_create`
- `POST ...?workflow=section_update`
- `POST ...?workflow=evidence_submit`
- `POST ...?workflow=package_approve`

Reads require `read_ai_governance`. Mutations require `manage_ai_governance`, trusted Origin, bounded Zod parsing, distributed fail-closed rate limiting and durable audit persistence.

## Transaction integrity

- package versions are allocated under a PostgreSQL advisory lock;
- package and twelve sections are created atomically;
- evidence triggers derive section evidence counts;
- section triggers derive package completion counters;
- approval locks the package and revalidates all twelve sections;
- approval and append-only decision persist in one transaction;
- RPC execution is restricted to `service_role`.

## Fail-closed approval

Approval is rejected for stale state, uncertain applicability, missing reviewer or approver, self-review, missing package digest, incomplete sections, missing evidence, invalid digests, stale reviews, or open high/critical findings.

## Evidence boundary

Repository tests prove static code and migration contracts only. Runtime migration execution, cross-tenant isolation, evidence authenticity, engineering adequacy, legal applicability and regulator acceptance require separate retained evidence and qualified review.
