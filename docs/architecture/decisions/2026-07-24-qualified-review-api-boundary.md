# ADR: Qualified Review Operational API Boundary

## Status

Proposed.

## Context

The repository already stores exact-SHA qualified-review campaigns and enforces atomic decision controls. Customers still needed a secure operational surface for campaign creation, reviewer onboarding, assignments, submissions, lifecycle decisions and sanitized evidence export.

## Decision

Expose one organization-scoped API route backed by a server-only administrative query layer. All mutations require trusted origin, explicit governance permission, bounded input, distributed rate limiting, durable audit persistence and no-store responses. Lifecycle decisions continue through the service-role-only PostgreSQL transition function.

Event history is append-only, only one current submission may exist per assignment, and a backend-only sweep expires overdue or invalid review records.

## Consequences

- The product can operate real review campaigns without direct authenticated database writes.
- Tenant boundaries and separation of duties remain fail-closed.
- Export packages are useful for evidence preparation but cannot be described as certification or regulator acceptance.
- Real reviewers, qualifications, opinions and approvals remain external human inputs.
