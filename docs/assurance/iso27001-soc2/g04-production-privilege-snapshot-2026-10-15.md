# RISCK COMPLY — ISO 27001 / SOC 2 G04 scoped exposure evidence

**Capture date:** 2026-10-15 (UTC). **Source:** authenticated Supabase Management connector, production project `tganhbbhfxcpblmgqprg`. **Method:** read-only PostgreSQL system-catalog queries and Supabase Security Advisor. **Security/privacy:** no business/customer rows read, no identities created, no emails, no SQL writes, no deployment, no DataGuard workspace actions.

> This document demonstrates a narrow **catalog access-control discovery** outcome; it is not a pentest, real-user authorization proof, ISO 27001 certification or SOC 2 examination.

## 1. Table RLS configuration

SQL used:

```sql
SELECT n.nspname AS schema_name,
       count(*)::int AS tables,
       count(*) FILTER (WHERE c.relrowsecurity)::int AS rls_enabled,
       count(*) FILTER (WHERE NOT c.relrowsecurity)::int AS rls_disabled,
       count(*) FILTER (WHERE c.relforcerowsecurity)::int AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p')
  AND n.nspname IN ('public','storage')
GROUP BY 1 ORDER BY 1;
```

| Schema | Tables | RLS enabled | RLS disabled | FORCE RLS |
| --- | ---: | ---: | ---: | ---: |
| public | 115 | 115 | 0 | 115 |
| storage | 8 | 8 | 0 | 0 |

**Interpretation:** the application-facing `public` tables were uniformly RLS-enabled and FORCE RLS-enabled during this capture. Supabase-managed `storage` system relations were RLS-enabled without FORCE RLS; this is a different provider-managed access model and should not be changed indiscriminately.

## 2. No-policy public tables

Supabase Security Advisor returned 33 `rls_enabled_no_policy` INFO findings in the `public` schema.

To examine effective direct grants, a catalog query enumerated each no-policy table (as identified by absence of `pg_policy` records) with `has_table_privilege` for both `anon` and `authenticated` across SELECT, INSERT, UPDATE and DELETE.

**Observed outcome:**

| Check | Result |
| --- | ---: |
| Public no-policy tables | 33 |
| Of those, RLS disabled | 0 |
| Of those, FORCE RLS disabled | 0 |
| Direct privilege = true among 33 x 2 roles x 4 operations | **0 / 264** |
| Unexpected direct grants returned | [] |

The scope supports **PASS: no exposed direct table grants to anon/authenticated** for these identified operations at the time of capture. An INFO lint about missing policies alone is **not** evidence of vulnerability; deny-by-default can be intentional.

**Limits:** this result does not validate server-side service-role queries, ownership, BYPASSRLS roles, privileged RPC chains, view access, grants through other roles, or actual tenant A/B behavior.

Reproducible per-table inventory in `scripts/security/audit-no-policy-direct-access.sql` (expanded to include anon INSERT/UPDATE/DELETE by this workstream).

## 3. Public SECURITY DEFINER function execution

Independent read-only `pg_proc` inventory with `prosecdef=true` and role-aware `has_function_privilege(...,'EXECUTE')`:

| Check | Observed |
| --- | ---: |
| Public SECURITY DEFINER functions | **126** |
| Directly executable by anon | **0** |
| Directly executable by authenticated | **0** |

**Scoped PASS:** no direct execute grants found for the two listed roles. This is a catalog-level statement only. Confirm function owners, secure search_path, privilege delegation, application call sites, service_role, and SQL function bodies before concluding the broader control.

Prior 2026-10-14 inventory had 125 such functions, and this capture had 126. This is a **count change**, not itself a security regression or vulnerability.

## 4. Supabase Auth advisor warning

Supabase Security Advisor also returned **one WARN**: `auth_leaked_password_protection`, indicating protection against passwords found in compromise databases was disabled at capture.

- Official remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Treat as an **OPEN CONFIGURATION GAP** requiring a deliberate compatibility/cost/plan check and appropriate runtime verification.
- No Auth configuration was modified during this evidence capture. MFA and sign-in validation remain separately scoped.

## 5. GitHub CI / audit-evidence integrity

On the latest inspected main SHA prior to this branch, GitHub Actions had repeated pre-run failures with `runner_id=0` and `steps=[]`; actual CI/security test results on that SHA could not be asserted.

An additional local source review found `package.json` specifies `test = vitest run`. Node's `node:test` `.mjs` suites are not automatically executed by Vitest. This branch adds explicit mandatory stages for:

```bash
node --test scripts/security/iso-soc2-register-audit.test.mjs
node scripts/security/iso-soc2-register-audit.mjs
```

to `.github/workflows/ci.yml` and `.github/workflows/full-security-suite.yml`. These commands were not considered remotely passed until a runner executes them successfully. A local Node v22 test on the unchanged source fixtures had **12/12 passing tests** at capture.

## 6. Mapping and completion

Candidate audit themes: ISO/IEC 27001:2022 access control and secure development; SOC 2 Security CC6 (logical access), CC7 (system operations) and CC8 (change management). Formal SoA applicability and detailed SOC 2 criteria mapping require management acceptance.

| Subcheck | State |
| --- | --- |
| public table RLS posture inventory | **READ_ONLY_VERIFIED** |
| 33 no-policy tables: ordinary client direct grants | **READ_ONLY_VERIFIED — 0 / 264 granted** |
| 126 public SECURITY DEFINER: ordinary client direct execute | **READ_ONLY_VERIFIED — 0 / 252 granted** |
| Supplier Auth leaked-password protection | **OPEN CONFIG_WARNING** |
| Privileged/service_role and function owner paths | **NOT_FULLY_VERIFIED** |
| Negative synthetic cross-tenant runtime test | **NOT_FULLY_VERIFIED** |
| Security CI on exact reviewed SHA | **BLOCKED_PRE_RUN** |
| G04 as an overall audit control | **PARTIAL** |
| Overall ISO/SOC 2 certification readiness | **NOT_YET_MEASURABLE** |

No false auditor approval, SOC 2 opinion, human management signature, Type II observation period, or ISO certificate is asserted.

## 7. Next execution work

1. Recover GitHub Actions runner execution without disabling required checks or assuming additional costs; confirm actual `steps`, exit codes and artifact records.
2. Review role inheritance, policy composition and all privileged call sites, including the additional public SECURITY DEFINER function.
3. Execute synthetic A/B negative authorization tests in a separately approved and isolated environment.
4. Determine whether leaked-password protection can be enabled under the existing Supabase tier without affecting current authentication expectations; apply via an authorized configuration capability after validation.
5. Collect independently reviewed operating evidence and map to management-approved scope / SoA / SOC 2 criteria.

**Security Advisor lint remediation reference:** https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
