# FRIA Operational Workspace

## Purpose

The FRIA workspace turns the Article 27 decision engine and persistence schema into a customer-facing workflow for creating, assessing, mitigating, evidencing and approving fundamental-rights impact assessments.

It supports readiness and evidence preparation. It does not provide legal advice, replace a DPIA, establish Article 27 applicability, validate evidence truth or authorize deployment.

## Customer route

`/[locale]/dashboard/fria`

The Regulatory Control Tower links directly to this route.

## API

`GET /api/ai-governance/fria`

Returns organization-scoped FRIA assessments and evidence metadata.

`POST /api/ai-governance/fria?workflow=...`

Supported workflows:

- `assessment_create`
- `assessment_update`
- `assessment_approve`
- `evidence_submit`

## Security boundary

- authenticated user and active organization required;
- reads require `read_ai_governance`;
- mutations require `manage_ai_governance`;
- trusted Origin is required for all writes;
- JSON is bounded and validated with Zod;
- distributed rate limiting fails closed;
- every query and mutation is filtered by `organization_id`;
- storage references must remain inside the active organization namespace;
- responses are no-store and errors are sanitized;
- the service-role client never reaches the browser.

## Audit and compensation

Every create and transition must persist a durable audit event.

If audit persistence fails:

- newly created assessments are deleted;
- newly created evidence is deleted;
- assessment updates and approvals restore the previous record;
- the API returns `503 fria_audit_unavailable`.

This prevents product state from advancing without an accountable audit trail.

## Approval boundary

Approval does not trust a browser-provided lifecycle state. The API reloads the tenant-owned assessment and executes `decideFria` again.

Approval returns `409 fria_approval_requirements_not_met` when required controls remain incomplete. The response may include missing control identifiers but never evidence bodies or internal error details.

## Evidence boundary

Evidence records store control identifiers, evidence type, safe storage reference, optional SHA-256 digest and review metadata. Uploaded content remains governed by the platform document and malware-scanning boundaries.

## Runtime validation still required

- apply and validate the FRIA migration in an isolated database;
- prove positive same-organization access;
- prove negative cross-organization access;
- validate audit compensation against a forced audit outage;
- test storage-reference rejection;
- run accessibility and localization review;
- verify AI-system ownership before production creation flows;
- obtain qualified legal and fundamental-rights methodology review.
