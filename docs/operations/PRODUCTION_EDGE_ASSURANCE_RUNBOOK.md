# Production Edge Assurance Runbook

## Purpose

Validate the public production edge for one exact `main` SHA without storing production URLs, response bodies, tokens, cookies, customer identifiers or provider payloads in canonical evidence.

## Protected execution

Run the `Production Edge Assurance` workflow from the protected `production-edge-assurance` GitHub environment. Configure only the `PRODUCTION_URL` secret. The workflow refuses non-HTTPS targets and verifies that the checked-out commit is the current `main` SHA.

## Automated controls

The workflow verifies:

1. HTTPS-only production target;
2. public landing availability;
3. health endpoint availability;
4. CSP, HSTS, nosniff, referrer and permissions headers;
5. `no-store` behavior for health evidence;
6. published `/.well-known/security.txt` with a contact field;
7. public vulnerability-disclosure/security page;
8. public Trust Center route;
9. observable edge-provider response signals;
10. bounded burst behavior without uncontrolled server failure.

## Evidence boundary

The resulting JSON contains booleans, status classes, header names and GitHub provenance only. It does not claim a specific commercial WAF or DDoS tier based solely on headers.

Automated edge assurance never proves:

- an independent security review;
- a penetration test;
- authenticated business-logic coverage;
- complete DDoS resistance;
- legal or regulatory certification.

Those controls remain `NOT_VERIFIED` until third-party evidence is reviewed and approved.

## Failure handling

- Missing security headers: block release and correct application or edge configuration.
- Missing `security.txt`: publish a valid disclosure contact and expiry policy.
- Missing Trust/Security routes: restore the public documents before release.
- 5xx during bounded burst: inspect edge, application, rate-limit and dependency logs.
- SHA mismatch: do not reuse the artifact; rerun against current `main`.

## Rollback

Revert the workflow, runner, validator, tests, runbook and ADR together. Delete imported edge evidence and return affected controls to `NOT_VERIFIED`.
