# ADR: Qualified Review Operational Workspace

- Status: Accepted
- Date: 2026-07-23

## Context

The product implementation and CI boundaries are complete, while final completion remains blocked by eight qualified legal and methodology reviews. The repository already validates review packages, but it lacked a tenant-scoped operational system for assignment, evidence preparation, independence checks, decisions, expiry and promotion.

## Decision

Add one operational workspace with:

- tenant-scoped review cases and reviewer roster;
- forced RLS and read-only authenticated table access;
- service-role-only mutations;
- optimistic concurrency and row locking;
- append-only decision records;
- preparer, reviewer and approver separation;
- exact-SHA and digest-backed evidence;
- a customer-facing status workspace;
- an artifact-only promotion adapter;
- focused lifecycle, migration, UI and promotion tests.

## Consequences

The system can now coordinate genuine human assurance without fabricating it. Completion percentage does not increase from this code alone. It increases only after qualified reviewers produce valid exact-SHA packages and the existing assurance campaign accepts them.
