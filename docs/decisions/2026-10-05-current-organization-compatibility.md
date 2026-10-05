# Compatibility routes use the canonical organization selector

Status: proposed; production verification pending.

The inventory/dashboard resolver prefers a completed active organization. The older compatibility helper instead selected the first membership. An older unfinished membership could therefore send the detail and governance routes to a different authorized organization, producing missing-resource or subscription errors.

Delegate compatibility selection to the existing canonical resolver and return its organization summary, preserving the legacy return shape. No new authority, membership privilege, subscription override, database migration, or RLS change is introduced. Active membership filtering, mandatory enterprise SSO enforcement, provider-error propagation, and the established fallback remain authoritative.

Regression coverage exercises two memberships, unfinished fallback, inactive membership rejection, empty membership, and provider failure. Existing SSO and tenant checks remain required. This is selection consistency within authorized memberships, not proof of every downstream production workflow.

Rollback: revert the compatibility helper and its regression test. There is no data or configuration rollback. Before any production acceptance, verify inventory/detail, FRIA, regulatory tower, and other compatibility consumers on the deployed SHA. Do not promote the manual journey score from local results.
