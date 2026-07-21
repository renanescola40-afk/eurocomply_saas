# FRIA and Fundamental-Rights Governance

## Purpose

This domain supports organizations in determining whether a Fundamental Rights Impact Assessment may apply, documenting context and affected groups, assessing potential impacts, managing mitigations, assigning human oversight, recording complaints/redress channels and retaining review evidence.

It is a decision-support and evidence-preparation workflow. It does not provide legal advice, replace a DPIA, guarantee compliance, determine regulator acceptance or issue an official assessment.

## Regulatory mapping

Primary mapping: EU AI Act Article 27. Related operational controls include human oversight under Article 14 and post-market monitoring under Article 72. Applicability, interaction with data-protection assessments and sector-specific duties require human/legal review.

## Workflow

`draft -> applicability_review -> assessment -> mitigation -> approval -> approved`

Blocking and terminal states: `blocked`, `retired`.

Uncertain applicability fails closed. High, critical or unknown residual impact requires completed legal/governance review before approval. Production use is allowed only after required controls and independent approval are recorded.

## Required evidence areas

- applicability rationale;
- intended purpose and context;
- affected and vulnerable groups;
- rights mapping;
- impact analysis;
- mitigation plan;
- human oversight;
- complaints and redress;
- post-market monitoring linkage;
- data-protection coordination;
- accountable owner, independent reviewer and approver;
- legal review where required.

## Data model

- `ai_fria_assessments`: versioned assessment and lifecycle;
- `ai_fria_evidence`: integrity-backed control evidence;
- `ai_fria_decisions`: append-oriented material decision history.

All records are tenant scoped. RLS is enabled and forced. Same-organization references prevent cross-tenant evidence attachment. Owner, reviewer and approver separation is enforced by constraints.

## Evidence boundary

Repository implementation demonstrates the decision contract, schema, integrity constraints, forced-RLS declarations and tests. It does not prove production migration, live tenant isolation, assessment quality, stakeholder consultation, legal sufficiency, regulator acceptance or actual mitigation effectiveness.

## Claims

Safe language: FRIA readiness, fundamental-rights risk visibility, evidence preparation, governance workflow and decision support.

Never claim: official FRIA, guaranteed legal applicability, certified fundamental-rights compliance, automatic regulator notification or replacement of legal counsel.
