# Regulatory Control Tower

## Purpose

The Regulatory Control Tower gives one organization-scoped view across the principal EU AI Act product workflows already implemented in the platform.

It is an operational visibility layer. It does not replace the underlying workflow, validate the evidence stored in that workflow, determine legal applicability, perform conformity assessment or certify compliance.

## Integrated workstreams

The first version aggregates:

1. AI Literacy — Article 4;
2. Fundamental Rights Impact Assessment — Article 27;
3. Prohibited Practices — Article 5;
4. High-Risk Provider Data Governance — Article 10;
5. Annex IV Technical Documentation — Article 11 and Annex IV;
6. Quality Management System — Article 17;
7. Conformity, Declaration, CE and Registration — Articles 43–49.

The combined weight of these workstreams is 44 points in the product-coverage model. The control tower does not replace or mutate the canonical product scorecard.

## Metrics

### Workflow activation

Activation measures the weighted workstreams that have a current persisted lifecycle record.

A draft or review-stage workflow counts as activated but not ready.

### Evidence readiness

Readiness measures the weighted workstreams whose latest persisted lifecycle state is:

- `active`;
- `approved`;
- `ready`;
- `complete` or `completed`;
- reviewed `not_applicable` or `not_required`.

A readiness percentage is an operational aggregation of workflow states. It is not a legal-compliance score and does not validate the quality or truth of the underlying evidence.

### Blocking state

The overall control-tower state fails closed to `blocked` when any workstream's current lifecycle state is blocked, rejected or failed.

Draft, assessment, review, mitigation, evidence-collection and approval-pending states remain `in_progress`.

Archived and retired records are treated as inactive, not as ready evidence.

## API

`GET /api/ai-governance/regulatory-control-tower`

Security controls:

- authenticated user required;
- active organization required;
- `read_ai_governance` permission required;
- distributed fail-closed rate limiting;
- every database query filtered by `organization_id`;
- administrative server client used only after authorization;
- no-store responses;
- sanitized error handling;
- no mutation support.

The endpoint returns lifecycle metadata only:

- workstream identifier;
- display label and article reference;
- weight;
- normalized operational status;
- source lifecycle state;
- latest record identifier;
- last update timestamp;
- safe required action;
- activation and readiness totals.

It does not return evidence bodies, legal analysis, personal data, dataset content, uploaded files or privileged reviewer notes.

## Customer interface

The dashboard page is available at:

`/[locale]/dashboard/regulatory-control-tower`

The interface provides:

- activation percentage;
- readiness percentage;
- ready, blocked, in-progress and not-started counts;
- one card per integrated workstream;
- last persisted lifecycle state;
- last update time;
- safe next action;
- direct navigation to an existing customer workflow where available.

The page currently links directly to the AI Literacy workflow. Remaining workstream editors must be exposed only after their write APIs meet the same authorization, origin, rate-limit, bounded-validation, audit and compensation requirements.

## Fail-closed behavior

The endpoint fails rather than returning a misleading partial snapshot when any underlying workflow query fails.

This is intentional. A partial control tower could hide a blocked or incomplete regulatory workflow and therefore must not be represented as a valid empty state.

## Evidence boundary

Repository implementation and tests can demonstrate:

- deterministic lifecycle normalization;
- weighted activation and readiness aggregation;
- blocked-state precedence;
- organization filters in every query;
- RBAC and no-store API contracts;
- customer-facing navigation and copy boundaries.

They do not prove:

- successful production migration of every underlying workflow;
- live cross-tenant isolation;
- the accuracy or legal sufficiency of stored evidence;
- external reviewer or notified-body acceptance;
- CE-marking or market-placement authorization;
- a 100% enterprise or legal-compliance result.

## Next integration steps

1. Add privileged write APIs for each workstream using the AI Literacy security pattern.
2. Add accessible localized workflow editors.
3. Link each workstream to the AI Inventory system record that it governs.
4. Add durable audit compensation for every material transition.
5. Add report and evidence-pack exports.
6. Execute live two-organization RLS and failure-path validation.
7. Promote verified exact-SHA product coverage without overclaiming.
