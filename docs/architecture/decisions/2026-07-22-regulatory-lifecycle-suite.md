# Regulatory Lifecycle Suite

- Date: 2026-07-22
- Status: Proposed
- Scope: Annex IV, Article 17 QMS linkage, conformity/CE/registration and GPAI

## Context

The canonical product registry identified three missing implementation workstreams worth sixteen points: Annex IV, conformity and GPAI. QMS already had a deterministic decision engine but lacked a shared persistent lifecycle with the other provider obligations.

## Decision

Introduce a common tenant-scoped programme model for versioning, controls, evidence digests, reviewer segregation and append-only approval decisions. Keep domain-specific evaluation engines separate so legal and technical rules do not collapse into one generic checklist.

## Security

Tables use forced RLS and service-role-only access. Creation validates organization membership, versions are allocated under an advisory lock, approval uses optimistic concurrency, requires reviewer and approver separation inputs, rejects open blockers and incomplete controls, and appends the approval decision atomically.

## Runtime proof

A transactional SQL proof creates a programme for tenant A, verifies it is not visible under tenant B filters and rolls back all fixtures.

## Truth boundary

The suite supports readiness and evidence management. It does not certify a QMS, complete Annex IV, issue a declaration, authorize CE marking, register a system, classify a GPAI model or replace qualified review.
