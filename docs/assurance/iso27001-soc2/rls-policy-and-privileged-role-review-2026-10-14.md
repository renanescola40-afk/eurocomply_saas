# RLS policy and privileged-role metadata review — 2026-10-14
Status: READ-ONLY INVENTORY. No effective-access testing; no ISO/SOC 2 assurance conclusion.

## Public RLS policies (227)
| Command | Permissive | Restrictive |
| --- | ---: | ---: |
| ALL | 3 | 47 |
| SELECT | 70 | 3 |
| INSERT | 30 | 3 |
| UPDATE | 31 | 3 |
| DELETE | 34 | 3 |

These are policy counts, not number of accessible tables. Policies may combine differently by role and operation.

## SECURITY DEFINER
125 public functions have an explicit function-level search_path as found in prior check.
A conservative **textual screening pattern** flagged 31/125 for possible inclusion of public or $user in search_path. This is a lead for manual inspection, not proof of unsafe configuration. Validate actual parameter values, trusted schemas, function bodies, ownership, EXECUTE grants and qualification of referenced relations.

## BYPASSRLS roles
Postgres role metadata reports BYPASSRLS enabled on postgres, service_role, supabase_admin, supabase_etl_admin and supabase_read_only_user; those are expected to require separate privileged-access threat modeling. anon and authenticated report BYPASSRLS false. Login capability differs by role. FORCE RLS does not constrain privileged BYPASSRLS roles.
Never rotate credentials, alter grants or invoke privileged functions in production during demo freeze.

## Next tests
- Review 31 search_path screening matches manually; prioritize functions reaching customer data.
- Validate privileged service-role exposure in application code without revealing keys.
- Verify effective tenant isolation using synthetic staging fixtures.
- Map controls to approved ISMS scope and AICPA TSC.
- Confirm management-owned operational controls and collect actual evidence.

## Progress
RLS policy-operation inventory: 227/227 categorized (100% categorization only).
Privileged role inventory: preliminary role discovery, not complete effective-access review.
ISO 27001 overall readiness: NOT YET MEASURABLE.
SOC 2 Type I / Type II readiness: NOT YET MEASURABLE.
DataGuard modified: NO. Production writes: 0. Emails sent: 0.
