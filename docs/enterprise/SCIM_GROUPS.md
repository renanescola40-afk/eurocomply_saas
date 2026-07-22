# Enterprise SCIM Groups

## Scope

This capability extends the existing SCIM v2 Users lifecycle with tenant-scoped group synchronization for enterprise identity providers.

Supported operations:

- `GET /api/scim/v2/Groups`
- `POST /api/scim/v2/Groups`
- `GET /api/scim/v2/Groups/{id}`
- `PUT /api/scim/v2/Groups/{id}`
- `DELETE /api/scim/v2/Groups/{id}`

## Security boundary

- organization scope is derived only from the authenticated SCIM bearer token;
- group payloads cannot choose an organization;
- every member identity must belong to the same organization and be active;
- mutable payloads are bounded to 128 KiB;
- group membership is capped at 10,000 identities;
- all endpoints use distributed fail-closed rate limiting;
- all responses are `no-store`;
- group and membership tables use forced RLS and are service-role only;
- database mutations are atomic and replace the complete membership set.

## Operational behavior

A group update is rejected when any referenced identity is missing, inactive or belongs to another tenant. The transaction rolls back rather than creating a partial group.

Deleting a group removes only the SCIM group mapping and its membership links. It does not deprovision users or release seats.

## Rollback

Before migration deployment, revert the migration, service, routes, tests and documentation together. After production migration, disable the Groups endpoints and use a reviewed forward migration. Do not destructively remove historical identity or audit data.

## Remaining runtime proof

Repository implementation does not by itself prove interoperability with every identity provider. Final evidence requires test-environment synchronization from at least one supported IdP, including create, replace-membership and delete operations across two isolated organizations.
