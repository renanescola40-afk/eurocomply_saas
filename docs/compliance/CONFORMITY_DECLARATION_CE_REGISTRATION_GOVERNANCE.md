# Conformity Assessment, EU Declaration, CE Marking and Registration Governance

## Purpose

This domain helps an organization prepare, review and retain evidence for a high-risk AI-system conformity journey. It connects the applicable conformity route to the Quality Management System, technical documentation, risk and data governance, operational controls, notified-body evidence where relevant, the EU declaration of conformity, CE-marking controls and registration readiness.

It is a readiness and evidence-management workflow. It does not itself perform a conformity assessment, issue a certificate, validate a declaration, authorize CE marking, submit data to an authority, replace a notified body or provide legal advice.

## Regulatory mapping

Primary mapping:

- Article 43 and Annexes VI/VII: conformity-assessment routes;
- Article 44: certificates;
- Article 47 and Annex V: EU declaration of conformity;
- Article 48: CE marking;
- Article 49: registration;
- Article 17: Quality Management System;
- Articles 9–15: high-risk system requirements;
- Articles 72–73: post-market monitoring and serious-incident processes;
- Articles 25 and 43: substantial-modification and renewed-assessment boundary.

The correct route, notified-body involvement, interaction with product-safety legislation and registration scope require accountable human and legal review.

## Lifecycle

`draft -> applicability_review -> evidence_collection -> assessment -> external_review -> declaration_ready -> registration_ready -> market_release_review -> approved`

Blocking and terminal states: `blocked`, `retired`.

The workflow fails closed when applicability, provider role or assessment route is uncertain. Market release is not permitted while required evidence is incomplete, notified-body evidence is missing, relied-upon certificates are expired, severe nonconformities remain open, the declaration is unsigned, CE controls are incomplete or required registration has not been completed.

## Control families

1. Applicability, operator role and route rationale.
2. QMS approval and governance.
3. Risk management and data governance.
4. Annex IV technical documentation.
5. Logging, transparency, human oversight, accuracy, robustness and cybersecurity.
6. Post-market monitoring and incident readiness.
7. Harmonised standards and common-specification review.
8. Notified-body evidence and certificate lifecycle where applicable.
9. Authorised-representative mandate where applicable.
10. EU declaration preparation, required elements, signature and integrity digest.
11. CE-marking applicability, artwork and release control.
12. Registration dataset, submission and identifier retention.
13. Substantial-modification reassessment.
14. Independent review and accountable approval.

## Data model

- `ai_conformity_assessments`: versioned route, readiness state and release boundary;
- `ai_conformity_evidence`: control-level evidence with review status and SHA-256 digest;
- `ai_eu_declarations`: versioned declaration drafts and signed records;
- `ai_eu_registrations`: registration preparation, submission and identifier history;
- `ai_conformity_decisions`: append-only material decisions.

All records are organization scoped. Child records use composite organization references. RLS is enabled and forced. Authenticated clients receive read-only access; privileged server APIs perform mutations. Accountable actors must belong to the same organization.

## Separation of duties

The assessment owner cannot also be the independent reviewer or approver. Evidence submitters cannot approve their own evidence. A signed declaration requires an accountable signer and an integrity digest. Material decisions are append-only.

## Evidence boundary

Repository implementation proves decision logic, schema constraints, tenant-scoped references, actor-scope triggers, RLS declarations, immutable-decision behavior and contract tests.

It does not prove:

- the correct legal route for a particular system;
- successful notified-body assessment;
- certificate authenticity or continuing validity;
- actual signing authority;
- legal sufficiency of a declaration;
- correct physical or digital CE marking;
- successful external registration;
- authority or regulator acceptance;
- production migration or live tenant isolation.

## Safe claims

- conformity-readiness workflow;
- EU declaration evidence preparation;
- CE-marking readiness controls;
- registration evidence management;
- notified-body coordination readiness;
- audit-ready decision history.

## Forbidden claims

- conformity certified;
- official conformity assessment completed by the platform;
- CE marking authorized;
- registration guaranteed;
- regulator approved;
- automatic or guaranteed EU AI Act compliance.
