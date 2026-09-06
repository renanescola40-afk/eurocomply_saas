# Internet.nl Email Baseline — 2026-09-06

**Domain:** `risckcomply.com`  
**Evidence type:** public third-party Internet standards test  
**Persistent report:** `https://internet.nl/mail/risckcomply.com/2029783/`  
**Observed score:** `69%`  
**100% Email claim:** `NOT_VERIFIED`  
**Hall of Fame claim:** `NOT_VERIFIED`

## Executive result

The official public Internet.nl mail test completed successfully and returned **69%**.

Passing categories:

- IPv6 — `PASS`;
- RPKI — `PASS`.

Failing categories:

- email authentication — `FAIL`;
- DNSSEC — `FAIL`;
- mail TLS — `FAIL`.

No mailbox contents, credentials or customer data were accessed and no outbound email was sent by the test.

## Email authentication

Observed:

- DKIM — `PASS`;
- SPF existence — `PASS`;
- SPF policy — `PASS`;
- DMARC — `FAIL` / record not detected;
- DMARC policy — not tested because DMARC was not detected.

### Owner-controlled free closure

A valid `_dmarc.risckcomply.com` TXT policy can close the missing-DMARC gap. The policy must be chosen conservatively and tested against all legitimate sending sources before moving to enforcement. Do not publish a strict `p=reject` record merely to improve a score without confirming alignment for every active sender.

## DNSSEC

Observed:

- `risckcomply.com` DNSSEC existence — `FAIL`;
- domain DNSSEC validation — not tested because the domain was unsigned;
- MX hostname DNSSEC existence for `smtp.google.com` — `FAIL` in this Internet.nl assessment;
- MX DNSSEC validation — not tested.

The registrable-domain portion is owner-controlled through the authoritative DNS provider plus the registrar DS delegation. The Google MX hostname portion is provider-controlled and cannot be truthfully fixed in the application repository.

## Mail TLS

STARTTLS and several transport controls passed, including:

- STARTTLS availability;
- forward-secrecy parameters;
- cipher ordering;
- TLS compression resistance;
- renegotiation controls;
- certificate trust;
- certificate signature;
- certificate hostname match;
- CAA;
- Extended Master Secret.

Provider-controlled findings on `smtp.google.com` include:

- cipher-suite selection outside Internet.nl's accepted sets;
- TLS 1.0 and TLS 1.1 still offered by the tested MX;
- RSA 2048 certificate public key classified as phase-out by this test profile;
- DANE/TLSA not present;
- SHA-1 key-exchange hash observed.

These are properties of the Google-operated mail endpoint, not RISCK COMPLY application code. Do not migrate email providers solely to chase a badge without a separate security, reliability, privacy, DPA, deliverability and operational review.

## Practical no-cost conclusion

Useful free improvements remain:

1. add a correct DMARC policy after sender inventory/alignment validation;
2. enable DNSSEC for `risckcomply.com` and register the DS record at the registrar;
3. re-run Internet.nl after those changes.

However, **100% Email is not presently owner-controlled while the tested Google MX retains the provider-side TLS/DANE/DNSSEC findings above**. Therefore no 100% badge claim will be made.

## Claim guardrails

Allowed:

- factual statement that SPF and DKIM passed the 2026-09-06 Internet.nl assessment, if accompanied by the date/report and without implying certification.

Not allowed:

- `Internet.nl 100% Email`;
- `secure email certified`;
- `DMARC protected` until a valid live DMARC record is independently verified;
- representing Google-operated MX TLS findings as RISCK COMPLY application defects or fixes.
