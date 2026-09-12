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

## Triage notes

- `NEXT_LOCALE` without `Secure`: confirmed; remediation is tracked on `security/beagle-remediation-20260912`.
- Next.js build manifest disclosure: inspected; observed manifest contains framework/runtime routing metadata and no secrets or credentials. Treat as informational framework exposure unless later evidence shows sensitive material.
- CSP `unsafe-inline`: confirmed but intentionally not removed blindly; nonce/hash migration requires a separately tested runtime design because current Next.js/localization/third-party scripts use inline behavior.
- Waitlist validation response detail: confirmed and queued for response minimization.
- DMARC and legacy cipher findings require current external/DNS/edge verification before closure.

## Gate state

`BEAGLE_TEST_COMPLETED=true`

`BEAGLE_REPORT_AVAILABLE=true`

`CRITICAL_OPEN=0`

`HIGH_OPEN=2`

`AUTOMATED_EXTERNAL_VAPT=NOT_PASS`
