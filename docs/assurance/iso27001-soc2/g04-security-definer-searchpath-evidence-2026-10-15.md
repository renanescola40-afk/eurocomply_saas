# G04 — SECURITY DEFINER search_path & schema-create evidence

**Evidence captured:** 2026-10-15 UTC. **Environment:** Supabase production `tganhbbhfxcpblmgqprg`. **Method:** read-only Postgres system-catalog queries. **Scope:** metadata controls, not execution of privileged functions or cross-tenant runtime access.

## Reproducible collection

Execute [audit-definer-searchpath-acl.sql](../../../scripts/security/audit-definer-searchpath-acl.sql) with an authorized read-only database client (or SQL connector). The saved SQL was executed against the connected Supabase project during this workstream with the results below.

| Observation | Result |
| --- | ---: |
| `public` SECURITY DEFINER functions | 126 |
| Functions without an explicit `search_path` GUC | **0 / 126** |
| Function search paths with textual `public` or `$user` component | **54 / 126** |
| `anon` granted CREATE on `public` schema | NO |
| `authenticated` granted CREATE on `public` schema | NO |
| `service_role` granted CREATE on `public` schema | NO |

Observed `search_path` distribution, text values from `pg_proc.proconfig`:

| `search_path` text | Functions |
| --- | ---: |
| `pg_catalog` | 47 |
| `public, pg_temp` | 29 |
| `""` (quoted empty identifier) | 24 |
| `pg_catalog, public` | 23 |
| `public` | 2 |
| `pg_catalog, auth` | 1 |

The **54 matches are review candidates**, not 54 proven vulnerabilities. In particular, function search order, quoted/empty identifiers, owners, schema-create rights, referenced object qualification, function body behavior and privileged execution paths determine actual exploitability.

The result **0 without a configured search_path** is a scoped metadata-pass. It does not prove secure function bodies or an appropriate search path.

Prior read-only checks found that `anon` and `authenticated` did not have direct EXECUTE on the then-observed 126 public SECURITY DEFINER functions. Those checks do not establish the safety of application service-role calls, SQL privileges of other roles or external requests.

## Technical finding classification

- **PASS — metadata coverage:** 126/126 SECURITY DEFINER functions inventoried for configured `search_path`, no absent configuration.
- **PASS — scoped role ACL:** ordinary frontend roles and `service_role` have no CREATE privilege on `public` in this capture.
- **OPEN — static candidate review:** 54/54 public-containing path function definitions need owner/definition review and referenced-object qualification assessment as appropriate.
- **OPEN — runtime isolation:** synthetic A/B tests and privileged server paths must be verified on the exact deployed release.
- **OPEN — overall G04:** remains partial and not an independent audit opinion.

## Safe follow-on

Prioritize 54 candidates by privilege, access path, and reach to organization-bound rows; read and reason about their source without executing privileged functions against customer data. Test targeted improvements in isolation. Do not automatically revoke grants or alter production `search_path` in bulk: this could break legitimate RPC execution and the active demo.

All activity for this evidence capture was read-only. No email, third-party audit, charge, production data write, customer-account interaction or security-policy bypass was performed.

**Important:** ISO 27001 and SOC 2 readiness remain `NOT_YET_MEASURABLE` because formal scope, operation records, independent review and external examination are separate requirements.
