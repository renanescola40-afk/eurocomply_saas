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

Public MDN HTTP Observatory v2 result returned:

- grade: `B`;
- score: `75`;
- tests passed: `10 / 12`;
- tests failed: `2 / 12`.

This is a useful security-hardening baseline but is **not yet a result suitable for an A/A+ promotional claim**. A detailed local run of the same current MDN scanner is being captured to identify the exact two failing tests before any header changes are proposed.

MDN explicitly describes Observatory as an HTTP security-header/configuration assessment; even a future A+ result must not be represented as proof that the whole SaaS is secure.

## OpenSSF Scorecard — PUBLIC RESULT NOT YET RESOLVED

The public Scorecard REST lookup for:

`github.com/renanescola40-afk/eurocomply_saas`

returned HTTP `404` during this baseline, so no public OpenSSF Scorecard badge/score is claimed yet.

The repository already contains a dedicated OSSF Scorecard workflow configured with `publish_results: true`; the publication path is being investigated before duplicating or weakening any existing repository-security control.

## Claims guardrail

Allowed now:

- `Green Web Foundation — green hosting verified for risckcomply.com.`

Not allowed yet:

- `MDN Observatory A` or `A+`;
- a numeric OpenSSF Scorecard score or badge;
- `green certified company`;
- `security certified by Mozilla/MDN/OpenSSF`;
- any implication that these technical checks replace CSA STAR, a penetration test, SOC 2 or an ISO certification.

## Next closure sequence

1. Capture the detailed MDN Observatory test output and close only safe, compatible header gaps.
2. Re-run the public MDN v2 scan after the approved Production release containing any verified hardening.
3. Resolve the existing OpenSSF Scorecard public publication path and expose a badge only after the actual public score is known and acceptable.
4. Add the Green Web Foundation result to the public Trust Center using exact bounded wording and an official source link/badge.
5. Continue Internet.nl website/email standards workstreams separately.
