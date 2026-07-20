# Enforce document uploader membership scope

- Status: Proposed
- Date: 2026-07-20
- Priority: P1
- Scope: `public.documents`

## Context

`public.documents` stores `organization_id` and nullable `uploaded_by` as independent foreign keys. The existing row-level policies authorize document access through the document organization, while the `uploaded_by` foreign key only proves that the referenced account exists.

Reviewed backend upload paths authenticate the current user, authorize `documents:write`, validate tenant-scoped storage paths, and persist that current user as `uploaded_by`. However, a service-role defect, migration, administrative script, or future privileged integration could still persist a document for one tenant while attributing it to a user from another tenant.

For controlled evidence and compliance records, cross-tenant actor attribution weakens auditability even when row visibility remains tenant-scoped.

## Decision

Add a prospective database trigger requiring every non-null `documents.uploaded_by` value to match an `organization_members (organization_id, user_id)` row for the same document organization.

The trigger runs before inserts and before updates that change either `organization_id` or `uploaded_by`. Null uploader attribution remains supported for system-generated or legacy-compatible records.

The trigger function is `SECURITY DEFINER`, uses an empty `search_path`, references fully qualified objects, and is not directly executable by `public`, `anon`, or `authenticated`.

## Impact

- Prevents new cross-tenant uploader attribution at the database boundary.
- Protects application, service-role, migration, and future integration writers consistently.
- Preserves existing RLS policies, grants, storage behavior, and nullable attribution.
- Does not rewrite or certify historical rows.

## Risks and trade-offs

- External or system upload workflows must use `uploaded_by = null` unless the actor is an organization member.
- Moving a document between organizations while retaining the former uploader will be rejected.
- Offboarded users remain valid only while their membership row exists; workflows that remove membership before changing attribution may need to null the uploader first.
- The migration has not been executed against production data in this change.

## Verification

A contract test checks the membership predicate, nullable behavior, trigger coverage, SQLSTATE, and function hardening. Repository CI remains the merge gate. No runtime database result, production-data audit, penetration test, or compliance certification is claimed.

## Rollback

Drop `enforce_document_uploader_member_scope` from `public.documents`, then drop `public.enforce_document_uploader_member_scope()`. Rollback restores the prior behavior and does not alter existing document rows.
