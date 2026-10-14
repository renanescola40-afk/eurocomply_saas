# RISCK COMPLY — Route, Dependency and Validation Discovery V1

**Baseline:** main `857ddfb21d0135df3a026ad480da5945119b175c`, 2026-10-14. All results are GitHub default-branch **search samples**, NOT an exhaustive filesystem enumeration. No test execution or deployment.

## Route discovery sample

Search `export async function POST` produced (first 30 ranked matches):

`/api/ai-systems`, `/api/ai-incidents`, `/api/gap-analysis`, `/api/team/invites`, `/api/auth/recovery`, `/api/gdpr/requests`, `/api/scim/v2/Users`, `/api/ai-literacy`, `/api/billing/portal`, `/api/stripe/webhook`, `/api/scim/v2/Groups`, `/api/legal-assurance`, `/api/billing/webhook`, `/api/team/break-glass`, `/api/documents/upload`, `/api/team/imports/csv`, `/api/ai-governance/qms`, `/api/team/members/role`, `/api/security/settings`, `/api/team/members/seat`, `/api/ai-governance/fria`, `/api/platform/contracts`, `/api/gdpr/delete-request`, `/api/team/members/remove`, `/api/team/access-runtime`, `/api/observability/smoke`, `/api/gap-analysis/report`, `/api/intelligence/refresh`, `/api/team/seat-contention`, `/api/billing/subscription`.

Search `export async function GET` additionally surfaced `/api/gdpr/export`, `/api/vendor-assurance/export`, `/api/retention-center/export`, `/api/continuity-center/export`, `/api/enterprise-readiness/export`, `/api/security-questionnaire/export`, `/api/team/access-operations/[jobId]/export`, `/api/health`, `/auth/google`, `/auth/callback`, `/api/ops/smoke`, `/api/ready/release`, `/api/ai-systems/[id]`, `/api/billing/catalog`, `/api/scim/v2/Schemas`, `/api/ai-incidents/[id]`, `/api/reports/tasks.csv`, `/api/reports/risks.csv`.

**Do not interpret search results as confirmed total routes, methods, auth guarantees or feature coverage.** Search ranking is truncated.

## Auth/action and code inspection

- `src/server/actions/organizations.ts`: `createOrganization()` requires current user, uses Zod `createOrganizationSchema.safeParse`, distributed fail-closed rate limiting, and the atomic `create_organization_with_owner_atomic` RPC via admin client. Only the beginning of the file was reviewed. **No functional execution proof.**
- `src/server/queries/current-organization.ts`: active membership filter and fail-closed fallback reviewed in previous architecture document.
- `tests/security/plan-boundary.test.ts`: checks `starter` and `growth` as self-service plans and `enterprise` as not self-service. Presence of this test does not mean it passed.
- Search for `createAdminClient(` returned numerous query modules including AI systems, risks, vendors, invites, members, documents, incidents, billing, governance and SCIM. **Review priority:** elevated client call sites and independent permission checks; search itself does not demonstrate a vulnerability.

## Third-party and open-source license evidence

The pre-existing `docs/trust/OPEN_SOURCE_LICENSE_DILIGENCE_2026-09-24.md` states an inventory of **940 package-lock entries and zero missing license metadata as of its 2026-09-24 snapshot**, with LGPL-bearing `sharp/libvips` packages specifically called out. This is a **historical internal claim**, not a re-count of the current lockfile, independent legal opinion or unconditional PASS for this baseline. A fresh SBOM and license review at the accepted commit remains pending.

The pre-existing `docs/security/SUPPLY_CHAIN.md` requires `npm ci --ignore-scripts` in CI and notes tag-based GitHub Action refs and floating dependency specs as residual risks; settings such as branch protection require independent confirmation.

Project manifest indicates Next.js `15.5.27`, React `^19`, TypeScript `^6`, Vitest `4.1.11`, Playwright `^1.56.1`, Stripe `^17.5.0`, `@supabase/supabase-js ^2.88.0`, Zod `^4.4.3`. Only exact manifest entries can be described as pinned; ranged dependencies require lockfile resolution.

## Buyer engineering next-step register

| Workstream | Evidence to collect | Acceptance criterion |
|---|---|---|
| Route coverage | Complete git tree + static route parser | Exact API, page and action counts tied to SHA |
| Feature verification | Local test suite, screenshots/logs from isolated fixtures | Per-feature PASS/FAIL/UNTESTED traceable to commit |
| Billing | Two webhook routes, invoice ordering tests, Stripe test fixtures | Same entitled state for supported event permutations |
| Auth and RBAC | Server actions, admin client call graph, tenant A/B tests | No cross-tenant access in isolated fixture matrix |
| Database | Migration graph, policies and schema | Tables, RLS and foreign keys mapped with evidence |
| OSS | Fresh lockfile SBOM and obligation review | Resolved versions, licenses, notices and review items |
| Runtime | Read-only deployment SHA and health evidence | Exact source-to-runtime correspondence |
| Handover | Provider ownership, secrets transfer, runbooks | No undocumented essential external dependency |

## Score discipline

This artifact is a **third distinct working document** among 12 target deliverables, but the buyer-grade complete count remains **0/12 (0%)** until full validation. Feature denominator is unknown: the original seven-feature ledger is a sample, not a comprehensive count.

**Production mutations=0; external communications=0; test commands executed=0.**
