# SCIM Groups conformance

## Repository status

The Enterprise SCIM surface supports tenant-bound Groups in addition to Users:

- `GET /api/scim/v2/Groups`
- `POST /api/scim/v2/Groups`
- `GET /api/scim/v2/Groups/{id}`
- `PUT /api/scim/v2/Groups/{id}`
- `PATCH /api/scim/v2/Groups/{id}`
- `DELETE /api/scim/v2/Groups/{id}`

Collection reads support `startIndex`, `count`, and `displayName eq "..."` filtering. Resource PATCH supports case-insensitive SCIM `Add`, `Remove`, and `Replace` operations for `displayName`, `externalId`, complete member replacement, member addition, removal of all members, and filtered member removal by identity resource ID.

## Security and tenancy invariants

- The bearer token digest authenticates the request and supplies the organization boundary.
- Request bodies cannot select an organization.
- Group and membership rows use organization-scoped relationships and forced RLS.
- Writes use the atomic PostgreSQL group RPCs.
- Member identifiers must resolve to SCIM identities from the same organization.
- Bodies, operation counts, membership counts, list counts, and rate limits are bounded.
- Responses use `Cache-Control: no-store` through the canonical SCIM response helper.

## Provider mapping

A SCIM Group is the external identity-provider group representation. It may be mapped by the organization administration layer to a department or access policy. Group membership itself does not grant a licensed seat; Users provisioning and reactivation remain subject to the central transactional seat ledger.

This separation prevents a group update from bypassing contract limits. Providers must provision or reactivate Users through the Users endpoints before assigning their SCIM identity IDs to a Group.

## Automated evidence

`tests/enterprise/enterprise-scim-groups-conformance.test.ts` verifies:

- collection and resource method coverage;
- token-derived tenant binding;
- pagination and filter contracts;
- PatchOp support;
- bounded request and rate-limit controls;
- atomic RPC usage;
- RLS and tenant-scoped persistence contracts.

## External validation required

The repository implementation is not a claim of provider certification. Before production enablement, record `EXTERNAL_VALIDATION_REQUIRED` evidence for:

1. Microsoft Entra ID provisioning with Users and Groups;
2. Okta provisioning with Users and Groups;
3. Google Workspace behavior when SCIM provisioning is available through the selected integration;
4. provider retry and replay behavior;
5. 10,000-member group behavior against a non-production Supabase project;
6. deactivation/reactivation and group-removal reconciliation;
7. sanitized audit and error telemetry.

No production credentials, bearer tokens, or provider secrets belong in this document or repository artifacts.
