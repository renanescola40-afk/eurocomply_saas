# Function resolution follow-up — 2026-10-14
Classification: internal read-only security evidence; does not establish ISO 27001/SOC 2 compliance.

## Verified metadata
- 54 of 125 public SECURITY DEFINER functions have public in explicit search_path.
- Of 54, 50 have language plpgsql and 4 language sql.
- has_schema_privilege(..., 'public', 'CREATE') returns false for roles anon, authenticated and service_role.
- These findings reduce one possible schema-object-injection exposure path for the named roles only; owners and other roles, function bodies, dynamic SQL and permission dependencies are not tested.
- Initial catalog query checking a literal PUBLIC role failed because PUBLIC is not a named role. This was corrected with a valid, narrower query rather than reported as a result.

## Work remaining metric (explicitly narrow)
Search-path metadata inventory: 125/125 = 100% completed / 0% remaining.
Search-path function body and effective-authorization review: 0/125 individually reviewed in this workstream = 0% completed / 100% remaining.
ISO/SOC2 overall percent complete and remaining: NOT YET MEASURABLE. This is not a statement that no prior operational controls exist.

## Next steps
- Read-only examine function definitions for 54 prioritized functions and verify schema-qualification and SQL execution.
- Investigate indirect role grants, service key storage, privileged pathways, and safe staging tenant-isolation tests.
- Assess ISO clauses 4–10, Annex A applicability and SOC2 controls before calculating a global denominator.

## Guardrails
DataGuard demo untouched; production reads only; no emails sent; no Stripe mutations; no certification claimed.
