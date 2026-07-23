# ADR: QMS Operational Boundary

- **Date:** 2026-07-22
- **Status:** Accepted for implementation

## Context

The repository already contained a governed Article 17 QMS domain, but customers could not operate it through the product. Internal audits and management reviews were not represented as first-class records, and approval was not transactionally tied to controls, CAPA and review evidence.

## Decision

Extend the existing QMS domain rather than create a parallel module. Add customer-facing workflows for system creation, controls, CAPA, audits, management reviews and atomic approval.

## Invariants

- organization scope is derived from the authenticated session;
- direct authenticated writes remain blocked;
- operational RPCs are service-role only;
- control effectiveness, accepted audit, approved management review and cleared CAPA are mandatory for approval;
- owner, reviewer, auditor and approver independence is enforced where applicable;
- stale approvals fail through optimistic concurrency;
- approval and decision history commit together;
- implementation supports readiness and evidence preparation, not certification.

## Consequences

The Regulatory Control Tower may link directly to a usable QMS workspace. Runtime migration validation, two-tenant negative testing, accessibility review and qualified external review remain separate evidence requirements.
