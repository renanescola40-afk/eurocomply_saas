# ADR: GPAI and Third-Party Model Governance Boundary

## Status

Proposed

## Context

The platform already had a general AI governance lifecycle, but no dedicated domain for general-purpose AI and third-party model dependencies. A generic AI-system assessment cannot reliably capture operator-role allocation, provider documentation, downstream restrictions, model-version change, possible systemic-risk scope, copyright-related evidence and the distinction between provider and deployer duties.

Treating these questions as a single checkbox would create false confidence and weak auditability.

## Decision

Create a dedicated tenant-scoped GPAI and third-party model governance domain with:

- a deterministic fail-closed assessment engine;
- explicit operator-role classification and rationale;
- model/provider/version traceability;
- versioned evidence records with SHA-256 digest support;
- append-oriented material decisions;
- possible and confirmed systemic-risk review states;
- human and legal escalation;
- accountable owner, independent reviewer and approver boundaries;
- forced RLS and organization-scoped foreign-reference validation.

The software will not make a final legal determination. Unknown operator roles and uncertain systemic-risk scope require human/legal review. Confirmed systemic-risk scope without indicator review blocks approval.

## Alternatives considered

### Extend the generic AI-system table only

Rejected. It would mix system-level and model-level obligations, weaken version traceability and make downstream/provider evidence hard to audit.

### Automatically classify legal role and systemic risk

Rejected. The result depends on facts, evolving guidance and legal interpretation. Automatic final classification would create unacceptable claims risk.

### Store provider documents directly in decision rows

Rejected. Decisions should retain bounded references and digests, not duplicate private documents or expose sensitive content.

## Consequences

### Positive

- clear distinction between AI systems and their underlying models;
- stronger third-party dependency governance;
- reproducible evidence and reassessment history;
- explicit legal-review boundary;
- safer enterprise procurement and downstream integration workflows.

### Trade-offs

- additional product and migration complexity;
- legal and provider-document review remain human dependencies;
- runtime migration and live tenant-isolation evidence remain required;
- systemic-risk applicability may change through Commission decisions or legal developments.

## Security and privacy

- every persisted entity is tenant-scoped;
- RLS is enabled and forced;
- cross-tenant evidence/decision references are rejected;
- material decisions are append-oriented;
- raw documents, secrets and signed URLs are outside canonical decision evidence.

## Rollback

Disable the GPAI workflow at the application layer and use a reviewed forward migration for production schema changes. Reverting repository files does not remove an already-applied database migration and does not authorize deletion of governance history.
