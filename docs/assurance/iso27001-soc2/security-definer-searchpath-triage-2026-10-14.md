# SECURITY DEFINER search_path triage — 2026-10-14
Read-only metadata inspection; no code or production changes.

## Verified counts
All 125 public SECURITY DEFINER functions are owned by postgres.
Configuration grouping:
- search_path=pg_catalog: 46
- search_path=public, pg_temp: 29
- search_path="" (empty search path): 24
- search_path=pg_catalog, public: 23
- search_path=public: 2
- search_path=pg_catalog, auth: 1
Sum 125.

**Correction of previous preliminary screening:** prior regex flagged 31 matches, but explicit grouping shows **54 functions** with `public` in their search_path (29+23+2). The earlier 31 figure was incomplete and MUST NOT be used for closure. Explicit search_path setting alone is not proof of a secure configuration; 54 functions require review for object resolution, write access to schemas, qualification of references, definer ownership, and calling privileges. The empty search_path group also requires careful validation of schema-qualified references. No vulnerability is confirmed by this grouping.

## Metrics
- search_path configuration identified: 125/125 (100% metadata inventory)
- function bodies + object-resolution safety assessed: 0/125 in this specific review (0% assessed here, not proof of insecure code)
- ISO 27001 overall readiness: NOT YET MEASURABLE
- SOC 2 Type I / II overall readiness: NOT YET MEASURABLE

## Next step
Prioritize read-only listing of 54 functions with public in search_path, inspect SQL bodies and object qualification in controlled manner, review applicable USAGE/CREATE grants on schemas, and propose staging-only tests. Maintain DataGuard and production freeze.
No emails sent; no production writes or demo access.
