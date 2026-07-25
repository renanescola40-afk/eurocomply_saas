# Qualified Review API Operations

## Purpose

Provide a secure operational API for the eight qualified legal and methodology review workstreams while preserving the `HUMAN_REVIEW_REQUIRED` boundary.

## Endpoint

`GET /api/ai-governance/qualified-reviews`

Returns the current organization-scoped campaigns, reviewers, assignments, submissions, decisions and recent append-only events.

`POST /api/ai-governance/qualified-reviews?workflow=<workflow>`

Supported workflows:

1. `campaign_create` — opens an exact-SHA campaign.
2. `reviewer_register` — records qualification evidence and an independence declaration.
3. `assignment_create` — assigns one canonical workstream with its fixed regulatory weight.
4. `submission_create` — stores a substantive opinion, scope, evidence references, validity and integrity digest.
5. `assignment_transition` — delegates lifecycle and separation-of-duties enforcement to the backend-only atomic RPC.
6. `evidence_export` — creates a sanitized organization-scoped evidence package.

## Security controls

- authenticated user and current organization required;
- `read_ai_governance` for reads and `manage_ai_governance` for mutations;
- trusted Origin validation;
- distributed fail-closed rate limiting;
- bounded Zod parsing with a 96 KiB limit;
- no-store responses;
- service-role database access remains server-only;
- tenant-scoped queries;
- append-only event history;
- optimistic assignment transitions;
- preparer, reviewer, assigner and approver separation;
- one current non-superseded submission per assignment;
- expiry sweep for due or expired reviews.

## Evidence minimization

Exports exclude reviewer email addresses and identity documents. Qualification references must point to redacted evidence locations rather than contain privileged advice, contracts, customer data or secrets.

## Truth boundary

This workflow proves only that a defined operational process and evidence record exist for an exact code SHA. It is not certification, regulator approval, notified-body acceptance, legal advice or a guarantee that a customer deployment complies with the EU AI Act.
