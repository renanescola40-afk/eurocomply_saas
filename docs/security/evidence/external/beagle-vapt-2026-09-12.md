# Beagle external automated VAPT — 2026-09-12

Status: REMEDIATION_REQUIRED

This record preserves non-confidential release-binding facts from the private Beagle Security report. The full provider PDF remains private and must not be committed to this public repository.

## Provider evidence

- Provider: Beagle Security
- Test type reported by provider: Black-box pentest / automated external web-application assessment
- Target: `https://www.risckcomply.com`
- Test start: `2026-09-10 18:52 UTC` (provider initiation email)
- Provider completion date: `2026-09-12`
- Report availability observed: `2026-09-12 16:42:46 UTC`
- Private report SHA-256: `5a71077f20000047a5d5b3b2865e5ba13760683cf1052a2f0e69326aa37ff281`

## Release binding

The provider report identifies the public target URL but does not print a Git SHA. Independent deployment evidence binds the tested public target to the Production deployment that was already live before test start and remained the active `www.risckcomply.com` alias when the report was collected:

- Production deployment: `dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9`
- Production Git SHA: `13b19410caa20045b19d98d58df406c43433af5a`
- Deployment created: `2026-09-10T16:05:18.153Z`
- Beagle test started after that deployment became Production.

This binding is repository/operator evidence, not a claim that Beagle independently attested the Git SHA.

## Finding counts

- Critical: 0
- High: 2
- Medium: 0
- Low: 6
- Very Low / informational: 2
- Total new findings: 10

The two High findings are legacy TLS protocol acceptance at the public edge (TLS 1.0 and TLS 1.1). Therefore the automated external VAPT gate is **not PASS** until the edge minimum TLS version is hardened and a provider retest confirms `Critical=0` and `High=0` on the remediated Production release.

## Finding triage matrix

| # | Severity | Finding | Triage | Closure condition |
| --- | --- | --- | --- | --- |
| 1 | High | TLS 1.0 enabled | Confirmed edge configuration finding. The public hostname is proxied by Cloudflare. Application code cannot disable the visitor-to-Cloudflare protocol. | Set Cloudflare zone Minimum TLS Version to TLS 1.2 or higher; externally verify TLS 1.0 handshake fails; Beagle retest closes the finding. |
| 2 | High | TLS 1.1 enabled | Confirmed edge configuration finding; same root cause/control plane as TLS 1.0. | Set Cloudflare zone Minimum TLS Version to TLS 1.2 or higher; externally verify TLS 1.1 handshake fails; Beagle retest closes the finding. |
| 3 | Low | `NEXT_LOCALE` cookie missing `Secure` | Confirmed. Root cause existed in next-intl routing defaults plus explicit middleware/client cookie writers. Remediation is implemented on `security/beagle-remediation-20260912`. | CI green, merge, Production deploy, verify Production `Set-Cookie`/client writer includes `Secure`, then retest. |
| 4 | Low | Next.js build manifest disclosure | Inspected. The reported public manifest contains normal framework/runtime metadata (including public rewrites and router data) and no observed secrets, credentials or customer data. Blocking this framework artifact would risk breaking Next.js. | Accepted informational framework exposure unless future evidence demonstrates sensitive content. Continue secret scanning and public-artifact review. |
| 5 | Low | CSP permits `unsafe-inline` | Confirmed hardening gap. Current runtime intentionally relies on inline behavior; blindly removing the directive can break Next.js/localization/Stripe/analytics. | Separate nonce/hash CSP migration with regression coverage, preview validation and Production retest. Not represented as fixed by this PR. |
| 6 | Low | DMARC missing/misconfigured | External DNS finding confirmed by Beagle report; current authoritative DNS value has not yet been independently re-read in this closure lane. | Verify current `_dmarc.risckcomply.com` TXT record, correct DNS if needed, wait for propagation, then externally recheck. |
| 7 | Low | Potential LUCKY13 exposure | Scanner finding associated with legacy TLS/cipher compatibility at the edge. Do not claim closure from application code. | Harden Minimum TLS Version to 1.2+ and use an external TLS scanner/retest to verify the reported exposure is no longer reachable. |
| 8 | Low | Potential BEAST exposure | Scanner finding associated with legacy protocol/cipher compatibility at the edge. Do not claim closure from application code. | Harden Minimum TLS Version to 1.2+ and use an external TLS scanner/retest to verify the reported exposure is no longer reachable. |
| 9 | Very Low / Info | Waitlist validation response reveals required fields | Confirmed response-minimization issue in `/api/prelaunch`, exposed publicly through `/api/waitlist` rewrite. Validation itself is bounded and rate-limited; only response detail is at issue. | Replace field-specific invalid-record response with a generic 400 error and regression-test that field names are not disclosed. |
| 10 | Very Low / Info | Misconfigured CSP | Overlaps the CSP hardening finding above. Existing CSP has strong directives (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`) but still uses `unsafe-inline`. | Close through the same separately tested nonce/hash CSP migration; do not double-count it as a second independent root cause. |

All ten provider findings have an explicit owner/disposition and closure condition. `FINDINGS_TRIAGED=true` means triage is complete; it does **not** mean all findings are remediated.

## Supporting security observations

- Production Supabase tables flagged by the advisor as `RLS enabled, no policy` were read-only inspected during this closure. For the 29 affected `public` tables, neither `anon` nor `authenticated` currently has SELECT or mutation privileges. They are therefore fail-closed to client roles; no permissive policies should be added merely to silence an informational advisor finding.
- The Beagle finding on the Next.js build manifest was reproduced against the reported asset. The observed content was normal framework routing/build metadata and contained no observed secret or credential material.
- The locale-cookie remediation changes preference-cookie transport only; it does not modify Supabase authentication or session-cookie semantics.

## Gate state

`BEAGLE_TEST_COMPLETED=true`

`BEAGLE_REPORT_AVAILABLE=true`

`FINDINGS_TRIAGED=true`

`EVIDENCE_PRESERVED=true`

`CRITICAL_OPEN=0`

`HIGH_OPEN=2`

`AUTOMATED_EXTERNAL_VAPT=NOT_PASS`
