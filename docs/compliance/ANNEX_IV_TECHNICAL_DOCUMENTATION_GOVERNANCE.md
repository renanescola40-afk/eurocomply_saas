# Annex IV Technical Documentation Governance

## Purpose

This domain manages the preparation, review, approval and lifecycle maintenance of technical documentation for AI-system governance and EU AI Act readiness.

It replaces a presence-only checklist with a versioned, evidence-backed and fail-closed workflow. The workflow supports technical-documentation readiness; it does not validate the truth of supplied material, perform an official conformity assessment, certify an AI system, authorize market placement or replace legal, engineering or notified-body review.

## Regulatory mapping

Primary mapping:

- Article 11 technical documentation;
- Annex IV minimum technical-documentation content;
- Articles 9–15 operational requirements referenced by the documentation;
- Article 43 conformity-assessment linkage;
- Article 72 post-market monitoring linkage.

The applicability of Annex IV, simplified documentation for eligible organizations, interaction with product-safety legislation and consequences of substantial modification require accountable legal and regulatory review.

## Package lifecycle

`draft -> applicability_review -> authoring -> review -> approval -> approved`

Additional states:

- `blocked`: severe findings or blocking controls remain unresolved;
- `not_applicable`: a reviewed non-applicability decision is recorded;
- `retired`: a superseded documentation version is retained as history.

Publication and conformity-assessment readiness are allowed only for an approved package with no blocking controls.

## Governed sections

The package maintains twelve controlled sections:

1. general system description;
2. system elements and development process;
3. monitoring, functioning and control;
4. risk management;
5. data governance and lineage;
6. validation, testing and performance metrics;
7. human oversight;
8. cybersecurity;
9. lifecycle changes;
10. standards and specifications;
11. EU declaration and conformity linkage;
12. post-market monitoring.

Each approved section requires:

- substantive summary;
- one or more evidence references;
- accountable owner;
- independent reviewer;
- valid review and approval timestamps;
- controlled source version;
- SHA-256 content digest;
- renewed review after any material change.

## Package controls

The fail-closed decision engine verifies:

- applicability and provider-role rationale;
- AI-system and documentation version control;
- independent approval of every section;
- system-to-evidence traceability;
- data provenance and lineage;
- validation and testing evidence;
- alignment with instructions for use;
- risk-management linkage;
- post-market monitoring linkage;
- conformity-assessment linkage;
- lifecycle change log;
- substantial-modification review;
- absence of open high and critical findings;
- accountable owner, reviewer and approver;
- legal review where uncertainty or severe findings require it.

## Data model

- `ai_annex_iv_packages`: package version and release state;
- `ai_annex_iv_sections`: controlled section content and approval state;
- `ai_annex_iv_evidence`: immutable digest-backed evidence references;
- `ai_annex_iv_changes`: immutable lifecycle and reassessment history;
- `ai_annex_iv_decisions`: immutable material decisions.

Every entity is organization scoped. Child references use composite organization keys. Row-level security is enabled and forced. Authenticated clients receive tenant-scoped reads only; privileged server APIs own mutations.

## Accountability boundary

- package owner, reviewer and approver must be separate where required;
- section authors cannot review their own content;
- evidence submitters cannot review their own evidence;
- material and substantial changes require independent review;
- all referenced actors must belong to the same organization.

## Evidence boundary

Repository implementation proves decision logic, schema constraints, RLS declarations, immutable-history controls and static contracts. It does not prove:

- production migration execution;
- live cross-tenant isolation;
- authenticity or technical accuracy of evidence;
- suitability of test methods or metrics;
- notified-body acceptance;
- regulator acceptance;
- official conformity or market-placement authorization.

## Safe claims

Safe wording includes:

- Annex IV readiness;
- technical-documentation workflow;
- evidence preparation;
- documentation lifecycle governance;
- traceability and review support.

Never claim:

- certified technical documentation;
- official conformity assessment;
- guaranteed regulator acceptance;
- automatic legal sufficiency;
- authorization to apply CE marking or place a system on the market.
