# Fail closed on document-register reads

- **Date:** 2026-07-17
- **Status:** Proposed
- **Priority:** P1
- **Area:** Product integrity, AI governance, SRE

## Context

The shared `listDocuments` query used the optional privileged Supabase client and returned an empty array when the client could not be created. It also returned an empty array when the database query failed.

A successful zero-row query and an unavailable document register therefore produced the same application state. Documents are used as compliance evidence and governance artefacts, so presenting an infrastructure or configuration failure as “no documents” can mislead dashboards, evidence preparation, expiry reviews, and procurement workflows.

## Decision

`listDocuments` must:

1. use the required `createAdminClient()`;
2. preserve organization scoping, ordering, and pagination;
3. return an empty array only after a successful query with zero rows;
4. log only the provider error code on query failure;
5. throw the stable application error `documents_register_unavailable` when the query fails.

## Consequences

### Positive

- Missing service-role configuration is no longer represented as an empty register.
- Database, provider, schema, and query failures remain distinguishable from a valid zero-document state.
- Existing application error boundaries can surface an unavailable-state response instead of governance data that appears complete.

### Risks

- Callers that implicitly depended on the previous empty-array fallback may now surface an error state. This is intentional fail-closed behavior for governance evidence.
- This change does not prove production availability or document completeness.

## Evidence

The source contract test verifies the required client, fail-closed query behavior, tenant filter, ordering, and pagination. No runtime evidence, audit, or penetration-test result is asserted by this decision.

## Rollback

Revert the commits in the associated pull request. Reintroducing the empty-array fallback would restore the prior behavior but would also restore the ambiguity between an unavailable register and a genuinely empty register.
