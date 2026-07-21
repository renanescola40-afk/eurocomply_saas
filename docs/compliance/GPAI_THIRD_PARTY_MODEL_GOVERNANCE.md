# GPAI and Third-Party Model Governance

## Purpose

This control plane helps organizations inventory general-purpose and third-party AI models, record their actual operator role, collect provider documentation, assess possible systemic-risk scope, govern downstream integration, retain evidence and obtain accountable approval.

It is decision support and evidence preparation. It does not determine legal status automatically, certify a model, perform an official conformity assessment or guarantee EU AI Act compliance.

## Regulatory scope

The workflow is designed to support operational mapping of:

- operator-role allocation, including provider, downstream provider, deployer, importer, distributor and product manufacturer;
- GPAI provider and downstream information duties;
- model identification, versioning, intended use and integration context;
- provider documentation, known limitations and risk information;
- acceptable-use and contractual restrictions;
- copyright-policy and training-content-summary evidence where applicable;
- possible or confirmed systemic-risk indicators;
- model changes, incident linkage and periodic reassessment;
- accountable human review, legal escalation and independent approval.

The exact applicability of EU AI Act obligations depends on the facts, the organization's role, the model and system context, applicable Commission decisions and future implementing or delegated acts. Legal review remains required for uncertain cases.

## Lifecycle

`draft -> review_required -> evidence_required -> approval_required -> approved`

Blocking or terminal states:

- `blocked`: confirmed systemic-risk scope lacks required review or another material issue prevents approval;
- `retired`: the model is no longer approved for the governed integration.

Approval is fail-closed. A model cannot be approved merely because its name appears in the registry.

## Core controls

1. Model, provider and version are identified.
2. Intended use and downstream integration are recorded.
3. The organization's operator role has a rationale and human review.
4. Provider documentation and limitations are reviewed.
5. Acceptable-use and contractual restrictions are reviewed.
6. Copyright-related documentation is reviewed when the organization is acting in a provider-like role.
7. Training-content summary evidence is retained when applicable.
8. Risk information is received and evaluated.
9. Systemic-risk indicators are reviewed when possible, confirmed or unknown.
10. Version and change monitoring is configured.
11. Incident linkage is configured.
12. A human reviewer is assigned.
13. Legal review resolves uncertain role or systemic-risk scope.
14. An independent approver records the final decision.

## Persistence and evidence

The migration creates:

- `ai_model_registry`: one tenant-scoped record per model/version and integration context;
- `ai_model_governance_evidence`: versioned evidence status, digest, review and expiry metadata;
- `ai_model_governance_decisions`: append-oriented material decisions and reassessments.

Every table contains `organization_id`, foreign keys, indexes, enabled RLS and forced RLS. Evidence and decisions must reference a model in the same organization. Material decisions cannot be updated or deleted by ordinary authenticated roles.

## Separation of duties

The accountable owner cannot also be the reviewer or approver. Approved records require an approver and timestamp. Reviewed, accepted or rejected evidence requires reviewer identity and review time.

## Evidence boundary

Repository implementation proves the schema, deterministic decision contract, constraints, RLS declarations, negative tests and documentation. It does not prove:

- that a production migration was applied;
- live cross-tenant isolation;
- authenticity or legal sufficiency of provider documents;
- correct operator-role classification;
- official systemic-risk designation;
- independent legal review;
- production approval quality;
- provider interoperability or continuous monitoring performance.

## Validation required before promotion

- lint, typecheck, tests and build on the exact branch head;
- migration execution in an isolated Supabase/PostgreSQL environment;
- positive and negative two-organization RLS validation;
- owner/reviewer/approver separation tests;
- decision immutability tests;
- evidence versioning, expiry and digest tests;
- human/legal review of the regulatory mapping;
- exact-SHA evidence accepted by the canonical enterprise scorecard.

## User-facing language

Use:

- GPAI readiness;
- third-party model governance;
- model risk visibility;
- provider evidence preparation;
- downstream integration governance;
- requires accountable human and legal review where applicable.

Do not use:

- fully compliant;
- certified GPAI model;
- guaranteed legal classification;
- official systemic-risk determination;
- automatic EU AI Act compliance.
