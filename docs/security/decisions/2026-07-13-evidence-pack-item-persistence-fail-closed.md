# Evidence pack item persistence must fail closed

Date: 2026-07-13
Status: Accepted for review

## Context

The enterprise evidence-pack workflow creates a parent record and then seeds the items that make the pack useful. On `main`, failure of the item insert was logged, but the workflow still returned the parent record with an empty item array. The API then emitted `201` and recorded `enterprise_evidence_pack_created`.

Repository evidence establishes a deterministic partial-write path. It does not establish that this occurred in production, affected a customer, completed an audit, or caused a regulatory breach.

## Decision

When required item persistence fails:

1. log only the provider error code;
2. attempt to delete the just-created parent record using both pack and organization identifiers;
3. log a sanitized cleanup failure if compensation also fails;
4. throw the original item error so the API uses its existing secure error response;
5. do not emit the success audit event or return `201`.

The item foreign key already uses `on delete cascade`, so deleting the parent also removes any associated rows if provider behavior ever permits a partial item write.

## Impact

Evidence-pack creation now fails closed instead of presenting a partial draft as a successfully generated pack. Authentication, RBAC, tenant selection, schemas, migrations, provider credentials, rate limits, and other enterprise workflows are unchanged.

## Risks and limitations

- This is compensating cleanup, not a database transaction. If both item insertion and cleanup fail, a parent record may remain and the sanitized cleanup error is logged for investigation.
- A future database RPC or transaction would provide stronger atomicity, but would require a migration and broader rollout review.
- No production behavior or data remediation is claimed.

## Tests and evidence

- `tests/evidence-pack-integrity.test.ts` enforces cleanup, rethrow, and success-event ordering.
- Existing enterprise workflow, lint, typecheck, unit, build, security, route, and production-gate workflows remain authoritative.
- GitHub Actions results on the final pull-request head are the execution evidence.

## Rollback

Revert the pull request. No schema, data migration, credential, provider, or infrastructure rollback is required. Reverting restores the prior partial-success behavior and should require explicit product and security review.
