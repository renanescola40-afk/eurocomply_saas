# SECURITY DEFINER — 54 function static source signals — 2026-10-14

## Evidence and methodology
Read-only PostgreSQL catalog query on 54 public SECURITY DEFINER functions with an explicitly configured search_path containing public. Computed literal pattern matches against pg_get_functiondef and function metadata. Does not run any function. The full source of each function was **not** manually reviewed; this is a preliminary static screen.

| Screen | Matches | Nonmatches |
|---|---:|---:|
| auth.uid() textual reference | 3 | 51 |
| organization_members textual reference | 16 | 38 |
| RAISE EXCEPTION textual reference | 28 | 26 |

Text matches cannot establish correct authorization or exceptions. In particular, many functions may enforce authorization at trusted server call sites. Absent text references are not proof of missing guards.

## Risk next steps
1. Perform call-site trace for organization creation, member role change and enterprise evidence pack creation; bind user IDs to verified auth context.
2. Check SQL functions for use via elevated service-role paths and privilege/grant chains.
3. Inspect full source of each priority function, beginning with direct tenant writes.
4. Test with isolated synthetic tenants and negative authorization cases, strictly outside production and DataGuard.

## Progress and remaining
- Static signal screening: 54/54 = 100% completed, 0% remaining.
- Prior detailed preliminary source inspections: 3/54 = 5.56% completed; 94.44% remaining (no new individually approved verdicts from this batch screen).
- Full effective-authorization tests: 0/54 = 0% completed; 100% remaining.
- ISO 27001 overall preparation %: NOT YET MEASURABLE.
- SOC 2 Type I/II overall preparation %: NOT YET MEASURABLE.

## Safety
No email, no production mutation, no DataGuard account interaction, no Stripe LIVE write, no certification claims.
