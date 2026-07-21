# ADR: Conformity, Declaration, CE Marking and Registration Boundary

## Status

Accepted for repository implementation; runtime, regulatory and external validation pending.

## Context

The product scorecard assigned only minimal coverage to conformity assessment, the EU declaration of conformity, CE-marking readiness and registration. Existing evidence and document features did not provide one versioned lifecycle that selected a route, connected prerequisite controls, handled notified-body dependencies, enforced separation of duties or prevented market-release approval while critical evidence remained incomplete.

## Decision

Create a dedicated conformity-governance domain with:

- deterministic fail-closed route and readiness decisions;
- explicit applicability and conformity-route states;
- dependencies on QMS, technical documentation and Articles 9–15 controls;
- notified-body evidence and certificate-validity boundaries;
- versioned EU declaration records with signer and digest integrity;
- CE-marking applicability and release controls;
- registration preparation, submission and identifier retention;
- substantial-modification reassessment;
- append-only material decisions;
- tenant-scoped composite references and forced RLS;
- accountable actor membership and separation of duties.

## Consequences

The product can organize conformity evidence and expose precise missing-control states without presenting repository code as a certificate or official assessment. Uncertain applicability, role or route requires legal review. Severe nonconformities, expired certificates and incomplete required registration block approval.

Customer-facing APIs and UI must reuse this canonical decision engine rather than reproduce route logic. Any eventual integration with an external notified body or registration service must retain provider-specific evidence separately and cannot silently promote readiness.

## Alternatives rejected

- A single “conformity complete” checkbox: no provenance, route logic or lifecycle.
- Automatically choosing the legal route: unsafe and likely to overstate certainty.
- Treating document generation as a signed declaration: insufficient authority and integrity.
- Treating CE artwork creation as permission to affix a mark: legally unsafe.
- Mutable decision history: weak auditability.
- Cross-tenant child identifiers without organization binding: unacceptable isolation risk.

## Validation required

- exact-head lint, typecheck, unit tests and build;
- isolated Supabase migration execution;
- positive and negative two-organization RLS tests;
- actor-scope and separation-of-duties validation;
- legal review of route and declaration methodology;
- notified-body workflow review with a qualified external expert where applicable;
- API/UI stakeholder and accessibility review;
- external registration interoperability proof before claiming submission support;
- canonical scorecard promotion only from accepted exact-SHA evidence.

## Rollback

Before migration execution, revert the domain files together. After production migration, disable mutations at the service layer and use a reviewed forward migration. Do not destructively remove declarations, registrations, evidence or material decisions.
