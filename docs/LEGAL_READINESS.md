# Risck Comply Legal Readiness

This document tracks the legal and trust materials required before broad public and enterprise contracting.

## Current truth status

- Repository preparation baseline: complete in Mega PR 1.
- Eight qualified review packages: prepared in Mega PR 2.
- Contract/privacy/counsel handoff pack: prepared in Mega PR 3.
- Founder factual record: `FOUNDER_FACT_REQUIRED`.
- Qualified legal acceptance: `HUMAN_REVIEW_REQUIRED`.
- Customer-specific compliance: `NOT_ASSESSED`.
- Formal conformity assessment: `NOT_ASSESSED`.

Preparation, CI, templates and generated drafts are not legal approval.

## Public legal surfaces

The public website has informational Trust Center surfaces for:

- Privacy;
- DPA summary;
- subprocessors;
- security;
- service commitments/status;
- compliance and data processing.

Before these surfaces are treated as final legal documents, they must be aligned with:

- `docs/legal-review-preparation/legal-pack/TERMS_OF_SERVICE_REVIEW_DRAFT.md`;
- `docs/legal-review-preparation/legal-pack/PRIVACY_POLICY_REVIEW_DRAFT.md`;
- `docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md`;
- `docs/legal-review-preparation/legal-pack/SUBPROCESSOR_REGISTER_REVIEW_DRAFT.md`;
- `docs/legal-review-preparation/legal-pack/SERVICE_SUPPORT_INCIDENT_SCHEDULE_REVIEW_DRAFT.md`.

## Founder facts gate

The authorised officer must complete and sign:

- `docs/legal-review-preparation/10_FOUNDER_FACTS_QUESTIONNAIRE.md`;
- `docs/legal-review-preparation/FOUNDER_FACTS_TEMPLATE.json`.

Required facts include legal entity, contacts, commercial policies, active providers, regions, retention, transfers, support/SLA commitments, security attestations and approved claims.

## Production legal checklist

Before accepting production customers, confirm:

- controller identity, contact address, purposes, legal bases, retention, rights and complaint channels;
- controller/processor role allocation and Article 28 DPA terms;
- active subprocessors, legal entities, regions, DPAs and transfer mechanisms;
- Stripe billing terms aligned with pricing, order forms and cancellation policy;
- GDPR export and deletion-request workflows operational and audited;
- organisation isolation enforced through RLS and server-side organisation checks;
- private storage and tenant-scoped access where customer files are used;
- incident and personal-data-breach notification process aligned with operational capability;
- liability, indemnity, governing law and dispute choices approved;
- public claims approved under `docs/legal-review-preparation/legal-pack/CLAIMS_REGISTER.json`.

## Counsel handoff

Use:

- `docs/legal-review-preparation/legal-pack/MASTER_LEGAL_OPINION_HANDOFF.md`;
- `docs/legal-review-preparation/legal-pack/FINAL_DECISION_SHEET_TEMPLATE.json`;
- the eight packages under `docs/legal-review-preparation/review-packages/`.

A decision receives credit only when reviewer identity, qualification, jurisdiction, independence/conflicts, exact product SHA, evidence digest, signed artifact, decision digest and validity pass the legal truth gate.

## Launch stance

The repository supports a controlled, evidence-bound launch posture. Broad enterprise contracting should not rely on the drafts until founder facts are signed and qualified European technology/privacy/AI counsel approves the exact final versions and SHA.
