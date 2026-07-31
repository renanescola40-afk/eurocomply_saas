# Counsel Change-Impact and Re-Review Policy

**Status:** `REVIEW_DRAFT` · `COUNSEL_DECISION_REQUIRED`

## Purpose

This policy limits repeat legal review to material changes while preserving fail-closed treatment of changes that can alter product role, intended purpose, legal obligations, data processing, contractual commitments or public representations.

The generated delta is a routing aid. Counsel decides whether its proposed scope is sufficient.

## Review outcomes

### `NO_COUNSEL_REREVIEW_REQUIRED`

Appropriate only where changes are demonstrably non-substantive, such as formatting, spelling, internal engineering notes or tests that do not alter behavior, legal sources, evidence conclusions, claims, contracts or data flows.

Requirements:

- no production behavior change;
- no customer-facing wording change;
- no legal-source change;
- no evidence or decision change;
- no security or privacy control change;
- no provider, region or retention change.

### `LIMITED_COUNSEL_REREVIEW_REQUIRED`

Applies when a bounded topic changes without altering the product's fundamental intended purpose or overall role.

Examples:

- one contract clause;
- one privacy or subprocessor fact;
- a public claim;
- one workstream workflow;
- a reviewer-portal control;
- one data-flow or provider configuration;
- one Article 50 notice;
- one FRIA, GPAI or conformity template.

Counsel should receive:

- base SHA and head SHA;
- exact changed files;
- affected global decisions;
- affected workstream packages;
- before/after text or behavior;
- updated evidence and tests;
- remediation log.

### `FULL_COUNSEL_REREVIEW_REQUIRED`

Applies where a change may alter the legal character of the product or invalidate reliance on the previous review.

Triggers include:

- intended-purpose change;
- new AI model or autonomous decision capability;
- new high-impact customer use case;
- legal-source or application-date change;
- new jurisdiction or B2C launch;
- material AI Act role change;
- new high-risk functionality;
- material modification or rebranding of a third-party AI system;
- automatic conformity, CE, registration or legal-decision behavior;
- change to all eight workstreams or their source hierarchy;
- compromise of review integrity or evidence binding;
- previous review expiry;
- counsel-defined change trigger.

## Exact-SHA binding

Every delta must record:

- repository;
- base SHA;
- head SHA;
- changed files;
- matched impact rules;
- affected decisions;
- affected workstreams;
- generated timestamp;
- delta digest.

A decision for one SHA must not be silently reused for another SHA.

## Change classes

| Change class | Default review |
|---|---|
| Legal source, effective date or precedence | Full |
| Intended purpose or product classification | Full |
| AI model/provider or autonomous capability | Full unless counsel narrows it |
| Public claims and marketing copy | Limited |
| Terms, Privacy, DPA, SLA, MSA or reviewer terms | Limited; full if business model changes |
| Data flow, retention, subprocessor or transfer | Limited; full if role or jurisdiction changes |
| Qualified-review mechanics | Limited across affected eight packages |
| Workstream methodology | Limited to affected workstream |
| Security implementation | Limited when customer commitments or legal evidence change |
| Tests proving unchanged behavior | No re-review unless evidence conclusion changes |
| Formatting and internal non-substantive documentation | No re-review |

## Counsel override

Counsel may:

- widen the proposed scope;
- narrow the scope with reasons;
- require fresh primary-source review;
- require specialist review;
- require customer-specific analysis;
- refuse reliance on the delta.

The platform must preserve the override and rationale in the signed decision record.

## Expiry and invalidation

A prior review becomes non-current when:

- its validity end date passes;
- its evidence digest no longer matches;
- the reviewed product SHA is not the deployed or promoted SHA;
- a listed change trigger occurs;
- professional standing or independence can no longer be verified;
- a material legal change affects scope;
- a security incident compromises the reviewed evidence;
- the reviewer revokes or supersedes the opinion.

## No automatic legal acceptance

The delta generator may output review scope. It may never output `ACCEPTED`, `COUNSEL_ACCEPTED`, certification, legal guarantee or customer compliance.