# Internet.nl Website Baseline — 2026-09-06

**Subject:** `www.risckcomply.com`  
**Evidence type:** public third-party standards test  
**Source:** Internet.nl single-domain website test  
**Canonical persistent report:** `https://internet.nl/site/www.risckcomply.com/4283368/`  
**Canonical observed score:** `75%`  
**100% claim:** `NOT_VERIFIED`  
**Hall of Fame claim:** `NOT_VERIFIED`

## Executive result

The live Internet.nl test completed successfully and returned a score of **75%** for the canonical Cloudflare-fronted RISCK COMPLY domain.

Passing categories:

- IPv6 — `PASS`;
- RPKI — `PASS`.

Failing score-impacting categories:

- DNSSEC — `FAIL`;
- HTTPS/TLS — `FAIL`.

Security options currently return a warning. Those warnings are useful hardening targets but are not promoted here as required-score blockers without evidence from Internet.nl scoring rules.

## Confirmed canonical score blockers

### DNSSEC

Observed findings:

- DNSSEC existence: failed;
- DNSSEC validation: not tested because a signed chain was not found.

Required closure is therefore an external DNS control: the authoritative zone must be DNSSEC-signed and the parent `.com` delegation must contain the correct DS record.

### TLS

The following required TLS subtests failed at the Cloudflare edge:

- cipher suites / algorithm selections;
- supported TLS protocol versions;
- key-exchange hash function.

Observed non-compliant examples included:

- TLS 1.0 and TLS 1.1 being accepted;
- CBC/SHA-family suites outside the current Internet.nl good/sufficient set;
- SHA1 accepted for key-exchange/signature negotiation.

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

The canonical response is currently served through Cloudflare. Cloudflare documents its default edge cipher profile as **Legacy**, which supports TLS 1.0–1.3 and includes older algorithms that security-testing tools may flag.

Cloudflare permits a zone-wide minimum TLS version of `1.2` on all plans, so TLS 1.0/1.1 can be closed without a paid add-on. However, Cloudflare documents cipher-suite customization — including its Modern/Compatible recommendation profiles — as requiring Advanced Certificate Manager.

Therefore, **raising Minimum TLS to 1.2 is useful hardening but must not be represented as sufficient for Internet.nl 100%**. The current evidence shows additional cipher-suite and SHA1 key-exchange failures that are independent of the protocol floor.

## Direct Vercel comparison — completed

The same Internet.nl harness tested the direct Vercel deployment host:

**Host:** `eurocomply-saas.vercel.app`  
**Persistent report:** `https://internet.nl/site/eurocomply-saas.vercel.app/4283372/`  
**Observed score:** `66%`

Category result:

- IPv6 — `FAIL`;
- DNSSEC — `FAIL`;
- HTTPS/TLS — `PASS`;
- Security options — `WARNING`;
- RPKI — `PASS`.

Most importantly, the direct Vercel edge passed the required TLS controls that fail on the current Cloudflare edge:

- TLS cipher suites — `PASS`;
- TLS versions — `PASS`;
- key-exchange hash function — `PASS`.

However, Vercel did not expose an AAAA address for the tested host and Internet.nl failed the web IPv6 category. Vercel's current public documentation also states that IPv6 is not supported.

### Decision

**Do not switch the canonical RISCK COMPLY hostname from proxied Cloudflare to DNS-only Vercel merely to improve the Internet.nl TLS result.**

That change would replace the current Cloudflare TLS failure with a Vercel IPv6 failure and would also remove the current Cloudflare proxy/security boundary. The measured direct-Vercel score was **66%**, lower than the canonical Cloudflare score of **75%**.

This candidate is therefore closed as `REJECTED_FOR_INTERNETNL_100_NO_COST`.

## No-cost feasibility conclusion

Based on the live tests and current provider capabilities, **Internet.nl 100% is not truthfully achievable with the current Cloudflare-proxied + Vercel architecture using only configuration that is known to be free**.

The current no-cost improvements remain worthwhile and should be completed when release governance allows:

1. enable DNSSEC at the authoritative DNS provider and ensure the parent `.com` DS delegation is correct;
2. raise the Cloudflare zone-wide Minimum TLS version to `1.2`;
3. keep TLS 1.3 enabled;
4. publish the already-merged RFC 9116 `security.txt` in canonical Production;
5. optionally add a CAA policy appropriate to the active certificate authorities after confirming the existing certificate issuance path;
6. rerun Internet.nl after each external change and preserve the persistent report.

Those controls can improve the real score and security posture, but the remaining Cloudflare cipher-suite restriction is not to be hidden or mislabeled.

### Paths to a genuine 100% result

A future 100% result would require one of the following to be proven by a fresh public report:

- Cloudflare edge cipher customization using a capability that permits a sufficiently strict cipher profile; or
- a different public edge/provider that simultaneously provides compliant TLS, IPv6, DNSSEC compatibility and the security/reliability controls RISCK COMPLY requires.

A provider migration must not be performed solely for a badge if it weakens production security, resilience, observability or release control.

## Application-controlled closure already merged

A standards-based RFC 9116 resource was added at:

`public/.well-known/security.txt`

It was merged to `main` through PR `#1959`. At the time of this update, canonical Production still serves SHA `8a30ca3e6d06a77a83d7f2d10f7cef7edfe040a6`, which predates that merge. A direct request to `https://www.risckcomply.com/.well-known/security.txt` still returns the application/login HTML instead of the intended text resource.

The repository fix must therefore not be represented as live until Production serves a descendant SHA and the public resource is revalidated with a `text/plain` media type.

## Assurance automation

PR `#1962` merged a bounded Internet.nl assurance workflow and evidence collector into `main`.

The workflow:

- runs the public single-domain Internet.nl test;
- records real score/category/subtest evidence;
- preserves the persistent report URL;
- prevents automatic `100%` claims when the public result is below 100%;
- stores no credentials or customer data;
- does not mutate DNS, Cloudflare or Production.

## Release and claims guardrails

1. Do not publish an Internet.nl `100% Website` badge while the real current report is below 100%.
2. Do not claim Hall of Fame presence unless the public Hall of Fame is independently verified.
3. Do not call Internet.nl output a certification; it is a public standards test/result.
4. Do not force a Production deploy solely for this assurance lane while the canonical release executor has outstanding P0/P1 work.
5. Do not purchase Advanced Certificate Manager or another paid product as part of this no-cost workstream without explicit owner approval.
6. Do not disable the Cloudflare proxy merely to improve one test result without a controlled security and rollback review.
7. Any Cloudflare DNS/TLS mutation requires a controlled change plan, rollback path and post-change production/security validation.

## Next proof sequence

1. Wait for the canonical release executor to promote a current approved `main` descendant to Production.
2. Verify `/.well-known/security.txt` returns the intended RFC 9116 text with a valid plain-text media type.
3. When authorized for DNS/TLS configuration, enable DNSSEC and set Cloudflare Minimum TLS to `1.2` using a controlled change.
4. Re-run the canonical Internet.nl assurance workflow.
5. Record the new persistent result and remaining blockers.
6. Publish a badge/claim only if the new public report itself supports the exact claim.
