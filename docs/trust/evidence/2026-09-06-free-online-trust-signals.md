# Free Online Trust Signals — 2026-09-06

**Subject:** RISCK COMPLY / `www.risckcomply.com`  
**Evidence type:** public, no-cost technical trust signals  
**Claim scope:** bounded to the exact third-party result; these are not regulatory certifications.

## Green Web Foundation — VERIFIED GREEN HOSTING

Public Green Web Check evidence returned:

- host: `www.risckcomply.com`;
- `green: true`;
- matched host: `risckcomply.com`;
- hosting provider reported by the Green Web Foundation: `Cloudflare`;
- evidence source: Green Web Foundation Green Web Dataset;
- observed check time: `2026-09-06T11:42:04.430858Z`;
- badge eligibility: `YES` for the verified-green website result.

Safe public wording:

> Green Web Foundation — green hosting verified for risckcomply.com.

Do not convert this into a claim that RISCK COMPLY, the legal entity, the full supply chain, or all customer workloads are sustainability-certified.

The official badge represents the website/hosting result only.

## MDN HTTP Observatory — B / 75

The public MDN HTTP Observatory v2 result and a current CLI scan both returned:

- grade: `B`;
- score: `75`;
- two non-passing checks.

Exact non-passing checks from the detailed scan:

1. `content-security-policy`: `csp-implemented-with-unsafe-inline` — `-20`.
   - production `script-src` currently contains `'unsafe-inline'`;
   - production `style-src` currently contains `'unsafe-inline'`;
   - the policy otherwise includes strong controls such as `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, HTTPS upgrade and bounded Stripe/Supabase/observability sources.
2. `cookies`: `cookies-without-secure-flag-but-protected-by-hsts` — `-5`.
   - the observed cookie is the non-session UI locale cookie `NEXT_LOCALE`;
   - HSTS is already present with `max-age=63072000; includeSubDomains; preload`;
   - adding the `Secure` attribute on HTTPS is a narrow, compatible hardening candidate.

All other Observatory checks in the current scan passed, including HTTPS redirection, Referrer-Policy, HSTS, SRI for the external Cloudflare beacon, `X-Content-Type-Options`, clickjacking protection and CORS posture. The current cross-origin-resource-policy result is informational/pass despite no explicit CORP header.

Closure strategy:

- fix the `NEXT_LOCALE` Secure-cookie gap first because it is narrowly scoped and does not require changing authentication semantics;
- do **not** remove CSP `'unsafe-inline'` blindly. The current app contains intentional inline script/style behavior, so moving to nonces/hashes requires a separately tested CSP design to avoid breaking Next.js, Stripe, analytics or localized navigation;
- no `A`/`A+` claim until a fresh public Observatory result itself returns that grade.

MDN Observatory is an HTTP security-header/configuration assessment; even a future A+ result must not be represented as proof that the whole SaaS is secure.

## OpenSSF Scorecard — 4.6 / 10 PREVIEW, NOT PUBLISHED

The public Scorecard REST lookup for:

`github.com/renanescola40-afk/eurocomply_saas`

returned HTTP `404`, so no public OpenSSF Scorecard badge/score is claimed yet.

A non-published OpenSSF Scorecard v5.5.0 preview run against the repository returned **4.6 / 10**. This score is not suitable for public promotion yet.

Strong checks:

- Security-Policy: `10/10`;
- Dependency-Update-Tool: `10/10`;
- Binary-Artifacts: `10/10`;
- SAST: `10/10`;
- Pinned-Dependencies: `8/10`.

Material low checks requiring truthful treatment:

- License: `0/10` — the repository is proprietary and has no detected open-source license. **Do not add an OSS license merely to improve Scorecard**, because that would materially change IP/licensing terms.
- Dangerous-Workflow: `0/10` — Scorecard flags the `workflow_run.head_sha` checkout in `supabase-migration-review-context.yml`; inspect and remediate only if the same evidence workflow can remain functionally safe.
- Token-Permissions: `0/10` — the repository has a number of workflows with write permissions. Some may be operationally required; reduce permissions only after per-workflow least-privilege review.
- Fuzzing: `0/10` — no fuzzing integration detected.
- Vulnerabilities: `0/10` — Scorecard/OSV reports known dependency vulnerabilities. This must be reconciled against the repository's existing npm audit gates and dependency graph before any public score is enabled.
- Packaging: not applicable/`-1` in the preview because this is an application repository rather than a distributable package.

The repository already contains a dedicated OSSF Scorecard workflow configured with `publish_results: true`; public publication remains disabled in this workstream until the score has been improved and reconciled. Do not publish a weak badge merely to obtain another badge.

## Claims guardrail

Allowed now:

- `Green Web Foundation — green hosting verified for risckcomply.com.`

Not allowed yet:

- `MDN Observatory A` or `A+`;
- a public OpenSSF Scorecard numeric score or badge;
- `green certified company`;
- `security certified by Mozilla/MDN/OpenSSF`;
- any implication that these technical checks replace CSA STAR, a penetration test, SOC 2 or an ISO certification.

## Next closure sequence

1. Harden `NEXT_LOCALE` with `Secure` on HTTPS and regression-test locale persistence.
2. Treat CSP nonce/hash migration as a separate, compatibility-tested security change rather than a badge-only tweak.
3. Remediate the OpenSSF Dangerous-Workflow finding if the evidence workflow can be made safer without losing its purpose.
4. Reconcile Scorecard's vulnerability findings against current lockfile and npm-audit evidence before enabling public Scorecard publication.
5. Add the Green Web Foundation verified-green result to the public Trust Center with exact bounded wording and an official source link; embed the remote badge only if CSP is deliberately updated and tested.
6. Continue Internet.nl website/email standards workstreams separately.
