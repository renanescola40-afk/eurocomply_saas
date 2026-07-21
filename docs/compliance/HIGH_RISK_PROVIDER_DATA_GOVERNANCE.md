# High-Risk Provider Data Governance

## Purpose

This domain helps organizations acting as providers of high-risk AI systems organize dataset inventories, provenance, quality assessments, bias analysis, mitigations, version control and monitoring evidence.

It supports readiness and evidence preparation. It does not establish that a dataset is lawful, unbiased, representative, technically sufficient or compliant with the EU AI Act or data-protection law.

## Regulatory mapping

Primary mapping:

- EU AI Act Article 10: data and data-governance requirements;
- Article 9: risk-management linkage;
- Article 11 and Annex IV: technical-documentation linkage;
- Article 15: accuracy, robustness and cybersecurity linkage;
- Article 17: quality-management linkage;
- Article 27: fundamental-rights coordination where relevant;
- Article 72: post-market monitoring and feedback.

Applicability, provider role, use of special-category data and sector-specific requirements require accountable human and legal review.

## Workflow

`draft -> applicability_review -> inventory -> assessment -> mitigation -> validation -> approval -> approved`

Blocking and terminal states:

- `blocked`;
- `not_applicable`;
- `retired`.

The workflow fails closed when applicability or provider role is uncertain, severe findings remain open, residual risk is high/critical/unknown, required bias mitigation is not validated, special-category data lacks review, or accountable approvals are missing.

## Control areas

### Inventory and intended use

- system and program version;
- dataset name and lifecycle role;
- intended purpose;
- source category;
- source version;
- training, validation and testing separation.

### Provenance and preparation

- collection provenance;
- acquisition-rights review;
- preparation and cleaning;
- annotation and labeling;
- lineage integrity;
- schema and source digests.

### Quality and statistical assessment

- relevance;
- representativeness;
- completeness;
- accuracy;
- statistical properties;
- data gaps;
- leakage testing;
- quality criteria.

### Bias and fundamental-rights coordination

- protected-group analysis;
- bias-risk assessment;
- mitigation design;
- independent effectiveness verification;
- severe residual-risk escalation;
- special-category data legal review where applicable.

### Lifecycle governance

- dataset version locking;
- material-change review;
- drift monitoring;
- post-deployment feedback;
- evidence retention;
- independent approval;
- retirement and supersession.

## Decision engine

`decideHighRiskProviderDataGovernance` evaluates 34 controls and returns:

- lifecycle stage;
- whether dataset release is allowed;
- whether conformity-readiness linkage is allowed;
- whether legal review is required;
- missing and blocking control identifiers;
- required actions;
- a non-certification evidence boundary.

The decision is deterministic and fail-closed. It does not automatically approve legal applicability, dataset quality or bias outcomes.

## Data model

- `ai_provider_data_programs`: versioned provider data-governance programs;
- `ai_provider_datasets`: dataset inventory and release state;
- `ai_provider_dataset_assessments`: versioned quality, bias and statistical assessments;
- `ai_provider_dataset_mitigations`: corrective and preventive data controls;
- `ai_provider_dataset_evidence`: immutable integrity-backed evidence;
- `ai_provider_data_decisions`: append-only material decision history.

## Security and tenant isolation

All records are scoped by `organization_id`.

Child records use composite foreign keys so a dataset, assessment, mitigation or evidence item cannot be attached across organizations or programs. RLS is enabled and forced. Authenticated clients receive organization-scoped read access only; mutations remain behind privileged server APIs.

Program owners, reviewers, approvers, assessors, verifiers and evidence submitters must belong to the same organization. Independent-review constraints prevent self-approval in critical transitions.

## Approval boundary

A program cannot be approved unless:

- applicability is required;
- the organization is acting as provider;
- at least one dataset exists;
- every dataset is approved;
- no high or critical finding remains open;
- owner, reviewer and approver are assigned and separated;
- integrity digest and review timestamps exist;
- review is newer than the last material change;
- special-category data review is complete where applicable.

A dataset cannot be approved unless:

- provenance and schema digests exist;
- all required assessments are approved;
- evidence exists;
- no severe finding remains open;
- independent review is recorded;
- review is newer than the last material change.

## Evidence boundary

Repository implementation demonstrates deterministic decision logic, schema constraints, organization-scoped relationships, RLS declarations, actor checks, immutable evidence and contract tests.

It does not prove:

- production migration success;
- live cross-tenant isolation;
- statistical validity of an assessment;
- lawful data collection or processing;
- absence of discriminatory outcomes;
- mitigation effectiveness in production;
- regulator, notified-body or customer acceptance.

## Safe claims

Allowed language:

- data-governance readiness;
- dataset risk visibility;
- bias-assessment workflow;
- provenance and lineage evidence preparation;
- provider control support.

Never claim:

- bias-free data;
- legally approved datasets;
- guaranteed Article 10 compliance;
- certified data governance;
- automatic legal-basis determination;
- regulator-approved market release.
