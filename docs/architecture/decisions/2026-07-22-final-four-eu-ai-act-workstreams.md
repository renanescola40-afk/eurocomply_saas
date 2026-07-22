# ADR: Final Four EU AI Act Operational Workstreams

- Date: 2026-07-22
- Status: Proposed for review

## Context

The canonical product rebaseline identified exactly 23 implementation points remaining across Deployer Obligations, Annex IV, Conformity/CE/Registration and GPAI.

## Decision

Implement four dedicated deterministic engines instead of one generic compliance checklist. Each engine owns its domain-specific applicability, evidence, approval, material-change and release-blocking rules.

## Invariants

- unresolved applicability fails closed;
- missing evidence never counts as complete;
- critical findings block readiness;
- material changes invalidate prior readiness;
- non-applicability requires rationale where relevant;
- human or qualified review cannot be synthesized by code;
- no engine claims legal compliance, certification or regulator approval.

## Follow-up

Customer APIs, persistence, runtime two-tenant proof and qualified review remain separate acceptance stages. The implementation score may increase after merge, while runtime and completed coverage remain fail-closed until their own evidence exists.
