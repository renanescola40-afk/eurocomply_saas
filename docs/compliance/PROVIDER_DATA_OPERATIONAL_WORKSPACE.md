# High-Risk Provider Data Governance Operational Workspace

## Purpose

The workspace at `/{locale}/dashboard/provider-data` turns the Article 10 provider-data governance domain into a customer-facing workflow. It supports programme scoping, dataset inventory, evidence preparation and accountable approval. It does not prove dataset quality, lawful processing, representativeness, absence of bias or regulatory acceptance.

## Workflow

1. Create a versioned programme for an AI-system reference.
2. Resolve applicability and provider role.
3. Add every training, validation, testing, reference, fine-tuning, retrieval, synthetic and monitoring dataset.
4. Complete provenance, quality, bias, leakage, data-gap and protected-group assessments.
5. Attach evidence and close mitigations.
6. Assign independent reviewer and approver.
7. Complete legal review when special-category data is used.
8. Approve only when every dataset is approved and no high or critical finding remains.

## API

- `GET /api/ai-governance/provider-data`
- `POST ...?workflow=program_create`
- `POST ...?workflow=dataset_create`
- `POST ...?workflow=program_approve`

Reads require `read_ai_governance`. Mutations require `manage_ai_governance`, trusted Origin, bounded Zod parsing, distributed fail-closed rate limiting, tenant validation, no-store responses and durable audit persistence.

## Transaction integrity

Programme versions are allocated under a PostgreSQL advisory lock. Dataset triggers derive programme counts. Final approval locks the programme, validates optimistic concurrency, actor identity, dataset completion, severe findings, independent review, digest and special-category legal review, then appends a decision in the same transaction.

## Evidence boundary

This workflow records evidence supplied by accountable users. It does not validate statistical methodology, source licences, representativeness, bias absence, technical performance, legal basis or conformity.