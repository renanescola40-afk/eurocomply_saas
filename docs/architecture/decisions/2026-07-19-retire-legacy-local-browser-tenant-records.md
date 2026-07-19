# Retire legacy browser-owned risk and document records

- Date: 2026-07-19
- Status: Proposed
- Priority: P0

## Context

The localized `/riscos` and `/documentos` pages duplicated the canonical organization risk and document registers. The risk page stored every record in one global `localStorage` key. The document page used server rows when present but silently substituted and persisted demo records when the tenant had no documents.

Browser storage has no organization boundary, durable audit trail, RLS, lifecycle policy or authoritative billing enforcement. Switching accounts in the same browser could expose residue from another session, and demo rows could be mistaken for persisted compliance evidence.

Canonical pages already exist at `/dashboard/organizations/risks` and `/dashboard/organizations/documents`. They resolve the authenticated user's current organization on the server and use tenant-scoped queries and mutations.

## Decision

- Keep the old localized URLs only as server redirects for compatible bookmarks.
- Delete both client-side record implementations and their global storage keys.
- Point dashboard, approvals, RACI and add-on navigation directly to the canonical organization routes.
- Keep canonical risk paths inside the analytics-sensitive path set.
- Add a repository contract that fails if either browser-owned implementation or its storage key returns.

## Consequences

- Risk and document records now have one product authority.
- Empty tenants see an empty canonical register rather than demo records presented inside a real workspace.
- Existing unsynchronized browser-only demo records are intentionally not migrated because their tenant ownership and provenance cannot be established safely.
- Bookmarks continue to work through a localized redirect.

## Evidence boundary

Repository tests prove routing, source boundaries and canonical server callsites. They do not prove production RLS, storage policies, deployed redirects or historical browser cleanup. No browser storage is read or deleted by this change.

## Rollback

Revert the redirect, navigation, analytics and contract changes together through a reviewed PR. Restoring browser-owned tenant records requires a new security decision and a tenant-scoped migration design; copying anonymous browser data into production is not an acceptable rollback.
