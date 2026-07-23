# ADR: Qualified Review Operations Platform

- Date: 2026-07-23
- Status: Accepted for implementation

## Context

Technical implementation, CI and runtime evidence can be automated. The remaining 51 completion points require real qualified legal or methodology review across eight workstreams. Repository JSON templates and validators existed, but there was no tenant-scoped operational system for campaigns, reviewers, assignments, submissions, decisions, expiry and audit history.

## Decision

Create a backend-first review operations platform with exact-SHA campaigns, verified reviewer profiles, independence and conflict declarations, deterministic assignment transitions, integrity-protected submissions, explicit acceptance decisions, forced RLS, backend-only writes, append-only events and exact-SHA CI reporting.

## Invariants

- automation cannot create reviewer acceptance;
- no review weight is awarded without a real accepted unexpired package;
- cross-SHA, conflicted, expired or incomplete packages fail closed;
- tenant scope comes from the server, never the submitted payload;
- direct authenticated table writes remain revoked;
- a green platform workflow does not mean legal review is complete.

## Consequences

The remaining enterprise gap becomes operationally manageable without inflating the canonical score. Reviewer invitation, portal UI, secure uploads and evidence export can build on this data and domain boundary.
