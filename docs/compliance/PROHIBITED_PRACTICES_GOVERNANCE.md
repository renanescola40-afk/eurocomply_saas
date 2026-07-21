# Prohibited Practices Governance

## Purpose

This domain helps organizations identify, document, review and preserve evidence concerning potential prohibited AI practices under Article 5 of Regulation (EU) 2024/1689.

It supports structured readiness and accountable review. It does not determine legality, validate an exception, authorize deployment, replace legal counsel or guarantee regulator acceptance.

## Regulatory mapping

The workflow covers the eight Article 5 signal families represented by the product:

1. subliminal, manipulative or deceptive techniques;
2. exploitation of age, disability or social/economic vulnerability;
3. prohibited social scoring;
4. individual criminal-offence risk prediction based solely on profiling or personality traits;
5. untargeted facial-image scraping;
6. emotion inference in workplace or education contexts;
7. biometric categorisation of sensitive traits;
8. real-time remote biometric identification in publicly accessible spaces.

Some provisions contain narrow distinctions or exceptions. The platform does not infer that an exception applies. A claimed exception must remain blocked until its legal basis, scope, authorization, safeguards, necessity and proportionality evidence are reviewed and approved by accountable humans.

## Compatibility boundary

The existing `assessProhibitedPractices` helper remains available for callers that need a deterministic tri-state screen.

That helper continues to:

- normalize boolean and tri-state answers;
- identify positive and unknown signals;
- block on positive signals;
- request review for unknown signals;
- return evidence collection guidance.

New governed workflows should use `decideProhibitedPracticesGovernance`. The governed function adds lifecycle, evidence, exception, review-freshness, finding and approval controls without breaking the original entrypoint.

## Governed lifecycle

`draft -> applicability_review -> evidence_review -> legal_review -> approval_pending -> approved`

Blocking and terminal states:

- `blocked`;
- `not_applicable`;
- `retired`.

The decision engine evaluates 26 controls:

- 18 cross-cutting governance controls;
- one completion control for each of the eight Article 5 signal families.

## Required context

A review cannot be treated as complete without recording:

- intended purpose;
- deployment contexts;
- affected persons and groups;
- relevant system capabilities;
- data sources;
- outputs and foreseeable consequences;
- accountable owner;
- independent reviewer;
- legal reviewer when required;
- independent approver;
- current review digest and timestamps.

## Signal-level review

Each signal assessment records:

- explicit `yes`, `no` or `unknown` answer;
- rationale;
- deployment context;
- consequence analysis;
- evidence count and digest;
- owner and independent reviewer;
- legal conclusion;
- material-change and review timestamps;
- approval or prohibited outcome.

An unknown answer is never treated as clear. A positive answer remains blocked until a qualified legal conclusion records one of:

- `prohibited`;
- `not_prohibited` after contextual review;
- `exception_supported` with a separately governed exception claim.

## Exception governance

A claimed exception is a separate record linked to the exact review and signal assessment.

A supported exception requires:

- exception type;
- legal basis;
- scope and purpose;
- safeguards and conditions;
- authorization reference;
- necessity and proportionality assessment;
- legal reviewer;
- independent approver;
- SHA-256 evidence digest;
- validity period;
- review and approval timestamps.

A supported exception remains evidence of an internal reviewed conclusion only. It is not an authority decision and does not remove obligations under other applicable law.

## Fail-closed rules

Production use remains blocked when:

- applicability is uncertain;
- any signal answer is unknown;
- a positive signal lacks evidence or legal conclusion;
- a legal conclusion identifies a prohibited practice;
- an exception claim lacks legal basis, authorization, necessity or proportionality evidence;
- any high or critical finding remains open;
- responsible actors are missing or not independent;
- review is older than the latest material change;
- review digest is absent or invalid;
- approval is missing.

A `not_applicable` outcome requires legal review, approval and an integrity digest. It is not inferred from an empty assessment.

## Data model

- `ai_prohibited_practice_reviews` — versioned system-level reviews;
- `ai_prohibited_practice_signal_assessments` — one governed assessment per Article 5 signal;
- `ai_prohibited_practice_exception_claims` — reviewed exception claims;
- `ai_prohibited_practice_evidence` — immutable signal and exception evidence;
- `ai_prohibited_practice_decisions` — append-only material decisions.

## Tenant isolation and security

All records are scoped by `organization_id`.

Composite foreign keys prevent reviews, signals, exceptions and evidence from being attached across organizations or to the wrong parent record. RLS is enabled and forced on every table.

Authenticated clients receive organization-scoped read access only. Mutations remain behind privileged server APIs so application-level authorization, trusted-origin checks, rate limits, bounded validation and durable auditing can be enforced.

Actor membership triggers require every owner, reviewer, legal reviewer, approver, submitter and decision actor to belong to the same organization.

Evidence and decisions are append-only. Material history must be superseded, not silently rewritten.

## Integration points

The governed result should feed:

- canonical role, scope and classification decisions;
- AI inventory and reassessment history;
- governance lifecycle production-use gates;
- risk and incident registers;
- FRIA and fundamental-rights workflows;
- Annex IV technical documentation;
- QMS and conformity workflows;
- post-market monitoring and change review.

## Evidence and truth boundary

Repository implementation proves deterministic decision logic, schema constraints, RLS declarations, actor checks and contract coverage.

It does not prove:

- production migration success;
- live two-tenant isolation;
- factual completeness of customer answers;
- legal sufficiency of a conclusion or exception;
- valid authority authorization;
- production absence of prohibited behavior;
- regulator acceptance.

## Safe claims

Allowed language:

- prohibited-practice screening;
- Article 5 review workflow;
- exception-evidence organization;
- accountable legal-review support;
- prohibited-practice risk visibility.

Never claim:

- automatic legal clearance;
- regulator-approved exception;
- guaranteed absence of prohibited practices;
- certified Article 5 compliance;
- authorization to deploy a system.
