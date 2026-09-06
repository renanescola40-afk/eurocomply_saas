# Internet.nl No-Cost Hardening Runbook

## Purpose

Improve the real Internet.nl result for `www.risckcomply.com` using only controls that are currently known to be available without purchasing a new product, while preserving RISCK COMPLY release and security boundaries.

This runbook does **not** authorize an external DNS/TLS change by itself. It defines the exact sequence, evidence and rollback requirements for an owner-approved change window.

## Current proven baseline

Canonical Cloudflare-fronted hostname:

- Internet.nl score: `75%`;
- IPv6: `PASS`;
- DNSSEC: `FAIL`;
- TLS: `FAIL`;
- RPKI: `PASS`;
- persistent report: `https://internet.nl/site/www.risckcomply.com/4283368/`.

Direct Vercel comparison:

- Internet.nl score: `66%`;
- IPv6: `FAIL`;
- DNSSEC: `FAIL`;
- TLS: `PASS`;
- RPKI: `PASS`;
- persistent report: `https://internet.nl/site/eurocomply-saas.vercel.app/4283372/`.

The direct-Vercel path is rejected because Vercel currently does not support IPv6 and the measured result is worse than the canonical Cloudflare result.

## Change 1 — Publish the merged RFC 9116 resource

Repository state:

`public/.well-known/security.txt` is already merged to `main` through PR `#1959`.

Production currently still serves SHA:

`8a30ca3e6d06a77a83d7f2d10f7cef7edfe040a6`

That release predates the `security.txt` merge and currently returns application/login HTML from `/.well-known/security.txt`.

### Acceptance after the canonical release executor promotes a current main descendant

Verify:

1. `GET https://www.risckcomply.com/.well-known/security.txt` returns HTTP `200`;
2. body is the intended RFC 9116 text rather than HTML;
3. `Content-Type` is a plain-text media type;
4. `Contact:` is present;
5. `Expires:` is present and valid;
6. no secrets or customer information are exposed.

Do not force a Production deployment solely for this assurance item.

## Change 2 — Enable DNSSEC with Cloudflare authoritative DNS + Squarespace registrar

Internet.nl currently reports that DNSSEC does not exist for the canonical domain. The registrar observed in the Internet.nl evidence is Squarespace Domains II LLC.

### Pre-change gates

Before enabling DNSSEC:

1. confirm the domain is currently delegated only to the intended Cloudflare nameservers;
2. capture the current Cloudflare DNS zone export or equivalent record inventory;
3. capture current NS, SOA and any existing DS state;
4. confirm there is no stale DS record at the registrar;
5. do not change nameservers during this operation.

### Cloudflare sequence

In the Cloudflare dashboard:

1. open the RISCK COMPLY zone;
2. go to `DNS` → `Settings`;
3. locate `DNSSEC`;
4. select `Enable DNSSEC`;
5. capture the generated DS values exactly, including:
   - key tag;
   - algorithm;
   - digest type;
   - digest.

Cloudflare signs the zone and generates the DS record information. For a registrar other than Cloudflare Registrar, the generated DS data must be added at the registrar.

### Squarespace registrar sequence

In Squarespace Domains:

1. open the domain;
2. open `DNS`;
3. open `DNSSEC`;
4. select `Add record`;
5. enter the Cloudflare-generated DS values exactly;
6. save the record.

Squarespace documents support for external DS records when a Squarespace-registered domain uses custom nameservers.

### Post-change acceptance

Do not call DNSSEC complete merely because both dashboards show a record.

Acceptance requires public validation showing:

- parent `.com` DS delegation exists;
- Cloudflare authoritative DNS publishes matching DNSKEY/RRSIG data;
- DNSSEC validation succeeds rather than returning SERVFAIL;
- Internet.nl DNSSEC category changes from `FAIL` to `PASS` in a new persistent report.

### DNSSEC rollback

If validation fails after the parent DS is published:

1. first remove the DS record at the registrar;
2. keep Cloudflare zone signing enabled until the DS TTL at the parent has expired;
3. only then disable DNSSEC signing in Cloudflare if rollback remains necessary.

Do not disable Cloudflare signing before removing/expiring the parent DS, because that can create a validating-resolver outage.

## Change 3 — Raise Cloudflare zone Minimum TLS to 1.2

The canonical Internet.nl report proves Cloudflare currently accepts TLS 1.0 and TLS 1.1. Cloudflare documents zone-wide Minimum TLS Version as available across Free, Pro, Business and Enterprise plans.

### Change

In Cloudflare:

1. open `SSL/TLS`;
2. open `Edge Certificates`;
3. locate `Minimum TLS Version`;
4. change the zone-wide minimum from its current value to `TLS 1.2`;
5. keep TLS 1.3 enabled.

### Expected effect

This should remove the known TLS 1.0 and TLS 1.1 protocol-version failures.

It does **not** prove that the Internet.nl TLS category will pass because the existing Cloudflare edge also failed cipher-suite and SHA1 key-exchange tests.

### Compatibility acceptance

After the change verify:

- landing page;
- login;
- signup;
- Stripe checkout launch;
- webhook-facing endpoints that are public HTTPS endpoints;
- Supabase browser flows from supported browsers;
- Enterprise SSO entry point;
- monitoring/health endpoint;
- supported browser matrix.

Legacy clients unable to negotiate TLS 1.2+ are intentionally rejected.

### Rollback

If a legitimate supported client or required provider integration breaks, revert only the Minimum TLS Version setting to the previous value and document the compatibility evidence before deciding on a permanent exception.

## Cloudflare cipher-suite residual blocker

Cloudflare documents its default client-facing cipher configuration as `Legacy`. Cloudflare also documents cipher-suite customization, including the predefined `Modern` and `Compatible` selections, as requiring Advanced Certificate Manager.

The canonical Internet.nl evidence currently shows required failures including CBC/SHA-family suites and SHA1 key-exchange support.

Therefore:

- do not claim that Minimum TLS 1.2 closes the entire TLS category;
- do not purchase Advanced Certificate Manager without explicit owner approval;
- do not weaken or remove the Cloudflare proxy merely to improve a badge;
- preserve the residual blocker transparently until a compliant no-cost provider configuration is proven or a paid capability is explicitly approved.

## Optional Change 4 — CAA

The canonical report currently observes missing CAA as a recommendation-level finding rather than one of the confirmed required-score blockers.

Before adding CAA:

1. determine every certificate authority currently required for Cloudflare Universal SSL / active certificate issuance;
2. confirm any provider-specific CAA requirements;
3. add only records that will not block legitimate renewal;
4. verify certificate renewal/issuance capability after propagation.

Do not add a restrictive CAA record based on guesswork.

## Final validation sequence

After approved changes are live:

1. verify canonical Production SHA;
2. verify `security.txt` HTTP status, body and media type;
3. verify DNSSEC publicly;
4. verify TLS 1.0/1.1 are rejected and TLS 1.2/1.3 work;
5. run the merged `Internet.nl Live Assurance` workflow;
6. preserve the new persistent Internet.nl report URL;
7. compare the result against the 75% baseline;
8. classify every remaining non-passing required subtest;
9. publish no badge beyond what the public report truthfully supports.

## Claims policy

Allowed today:

- `Internet.nl website test completed — 75% baseline` when accompanied by the persistent report and date.

Not allowed today:

- `Internet.nl 100% Website`;
- `Internet.nl certified`;
- `Internet.nl Hall of Fame`;
- any statement implying independent certification.

A 100% badge/claim may be considered only after a fresh public persistent report returns `100%` for the canonical RISCK COMPLY hostname.
