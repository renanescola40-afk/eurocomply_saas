# Internet.nl Website Baseline — 2026-09-06

**Subject:** `www.risckcomply.com`  
**Evidence type:** public third-party standards test  
**Source:** Internet.nl single-domain website test  
**Persistent report:** `https://internet.nl/site/www.risckcomply.com/4283346/`  
**Observed score:** `75%`  
**100% claim:** `NOT_VERIFIED`  
**Hall of Fame claim:** `NOT_VERIFIED`

## Executive result

The live Internet.nl test completed successfully and returned a score of **75%**.

Passing categories:

- IPv6 — `PASS`;
- RPKI — `PASS`.

Failing score-impacting categories:

- DNSSEC — `FAIL`;
- HTTPS/TLS — `FAIL`.

Security options currently return a warning. Those warnings are useful hardening targets but are not promoted here as score blockers without evidence from Internet.nl scoring rules.

## Confirmed score blockers

### DNSSEC

Observed findings:

- DNSSEC existence: failed;
- DNSSEC validation: not tested because a signed chain was not found.

Required closure is therefore an external DNS control: the authoritative zone must be DNSSEC-signed and the parent `.com` delegation must contain the correct DS record.

### TLS

The following required TLS subtests failed:

- cipher suites / algorithm selections;
- supported TLS protocol versions;
- key-exchange hash function.

The following TLS controls passed:

- HTTPS availability;
- HTTP-to-HTTPS forcing;
- HSTS;
- HTTP compression handling;
- forward-secrecy parameters;
- cipher ordering;
- TLS compression;
- renegotiation controls;
- certificate trust, key, signature and hostname match;
- zero-RTT;
- Extended Master Secret.

CAA, DANE and OCSP-stapling observations are tracked separately and are not represented as the current required-score blockers.

## Cloudflare edge constraint

The canonical response is currently served through Cloudflare. Cloudflare documents its default edge cipher profile as **Legacy**, which includes TLS 1.0–1.3 and several TLS 1.2 static-RSA / CBC cipher suites. Internet.nl v1.11 evaluates TLS against the 2025 NCSC-NL TLS guidance and treats algorithm selections outside its good/sufficient/phase-out sets as insufficient.

Cloudflare permits a zone-wide minimum TLS version of `1.2` on all plans, so TLS 1.0/1.1 can be closed without a paid add-on. However, Cloudflare documents cipher-suite customization as requiring Advanced Certificate Manager. Therefore, **do not claim that changing Minimum TLS to 1.2 alone is sufficient for Internet.nl 100%**.

The no-cost path being evaluated is whether keeping Cloudflare as authoritative DNS with DNSSEC enabled, while routing the public website directly to the Vercel edge (DNS-only rather than Cloudflare-proxied), produces an Internet.nl-compliant TLS profile. That path must be proven before any DNS/proxy change because it changes the external security boundary and may alter WAF/edge behavior.

## Application-controlled closure already merged

A standards-based RFC 9116 resource was added at:

`public/.well-known/security.txt`

It was merged to `main` through PR `#1959`. At the time of this baseline, canonical Production still served SHA `8a30ca3e6d06a77a83d7f2d10f7cef7edfe040a6`, which predates that merge, so the live Internet.nl report still observed `security.txt` as a warning. The repository fix must not be represented as live until Production serves a descendant SHA and the public URL is revalidated.

## Release and claims guardrails

1. Do not publish an Internet.nl `100% Website` badge while the real current report is below 100%.
2. Do not claim Hall of Fame presence unless the public Hall of Fame is independently verified.
3. Do not call Internet.nl output a certification; it is a public standards test/result.
4. Do not force a Production deploy solely for this assurance lane while the canonical release executor has outstanding P0/P1 work.
5. Do not purchase Advanced Certificate Manager or another paid product as part of this no-cost workstream.
6. Any Cloudflare proxy/DNS change requires a controlled change plan, rollback path and post-change production/security validation.

## Next proof sequence

1. Compare the canonical Cloudflare edge with the direct Vercel edge through the same Internet.nl test harness.
2. If Vercel passes the TLS-required subtests, evaluate a DNS-only Cloudflare-to-Vercel architecture without changing authoritative DNS.
3. Enable DNSSEC at the authoritative DNS provider and ensure the correct DS record exists at the registrar/parent.
4. Revalidate canonical Production after the `security.txt` merge is deployed.
5. Run a fresh Internet.nl canonical test.
6. Publish the badge/claim only if the new persistent report itself returns `100%`.
