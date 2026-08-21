# Legal 8/8 closure evidence

Prepared: 2026-08-21  
Post-merge runtime revalidated: 2026-08-21  
Production subject: `https://www.risckcomply.com`  
Production main SHA observed: `6a3876527cf48f63ddda03145cbe6ae855efc62c`  
Production Vercel deployment observed: `dpl_4sEhCHco9oTuMMfDkkSAj8isns2i`  
Production deployment URL observed: `https://eurocomply-saas-q247ic2c1-renanescola40-afks-projects.vercel.app`

## Gate results

- `LEGAL_PUBLIC_SURFACES_PT: PASS`
- `LEGAL_PUBLIC_SURFACES_EN: PASS`
- `LEGAL_PUBLIC_RUNTIME: PASS`
- `ANALYTICS_CONSENT_LIVE_FLAG: OPEN`
- `LEGAL_8_OF_8: HUMAN_BLOCKER`

The eight legal/trust disclosure surfaces are now deployed and publicly reachable in both Portuguese and English on the exact production release above. This closes the known public-route/runtime evidence debt created when Cookie Policy, Acceptable Use and International Transfers were not yet deployed as public surfaces.

Technical publication is not legal approval. `LEGAL_8_OF_8` remains fail-closed because founder facts, provider contractual/transfer evidence and qualified legal acceptance are not replaced by HTTP 200, repository tests or engineering review.

## Canonical rubric

1. Terms of Service
2. Privacy Policy
3. DPA
4. International Data Transfers / SCC annex
5. Cookie Policy
6. Subprocessor List
7. Acceptable Use Policy
8. Security & Compliance / TOMs

## 8/8 matrix

| # | ITEM | PUBLIC SURFACE | DOCUMENT / PUBLICATION STATE | PRODUCTION RUNTIME | COUNSEL / EXTERNAL EVIDENCE | FINAL STATUS |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Terms | `/[locale]/terms` | production draft; final legal version/effective date unresolved | `pt` 200; `en` 200 | founder facts + qualified review unresolved | HUMAN_BLOCKER |
| 2 | Privacy | `/[locale]/privacy` | informational legal-review draft | `pt` 200; `en` 200 | controller/founder facts + qualified review unresolved | HUMAN_BLOCKER |
| 3 | DPA | `/[locale]/dpa` | public summary/review draft, not a signed final DPA | `pt` 200; `en` 200 | final terms/signature + qualified review unresolved | HUMAN_BLOCKER |
| 4 | SCC / Transfers | `/[locale]/transfers` | `0.1-review`; effective date pending qualified legal approval | `pt` 200; `en` 200 | provider mechanisms/SCC evidence not fully accepted | HUMAN_BLOCKER |
| 5 | Cookie Policy | `/[locale]/cookie-policy` | `0.1-review`; `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED` | `pt` 200; `en` 200 | final provider/retention/config reconciliation + qualified review unresolved | HUMAN_BLOCKER |
| 6 | Subprocessors | `/[locale]/subprocessors` | informational/legal-review draft | `pt` 200; `en` 200 | active provider DPA/location/transfer evidence incomplete | HUMAN_BLOCKER |
| 7 | Acceptable Use | `/[locale]/acceptable-use` | `0.1-review`; `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED` | `pt` 200; `en` 200 | final Terms relationship + qualified review unresolved | HUMAN_BLOCKER |
| 8 | Security / TOMs | `/[locale]/security` | conservative evidence-bound disclosure, not a signed TOM exhibit | `pt` 200; `en` 200 | final TOM/counsel review + independent pentest evidence unresolved | HUMAN_BLOCKER |

## Post-merge public runtime matrix

All requests below were made against `https://www.risckcomply.com` after PR #1750 was merged and while production was bound to main SHA `6a3876527cf48f63ddda03145cbe6ae855efc62c` / deployment `dpl_4sEhCHco9oTuMMfDkkSAj8isns2i`.

| ROUTE | PT | EN | ROUTE AUTHORITY RESULT |
| --- | ---: | ---: | --- |
| Terms | 200 | 200 | public |
| Privacy | 200 | 200 | public |
| DPA | 200 | 200 | public |
| International Transfers | 200 | 200 | public |
| Cookie Policy | 200 | 200 | public |
| Subprocessors | 200 | 200 | public |
| Acceptable Use | 200 | 200 | public |
| Security | 200 | 200 | public |

Observed responses carried the deployed Sentry release `6a3876527cf48f63ddda03145cbe6ae855efc62c`, providing an independent runtime marker that the tested pages belong to the current release rather than the pre-merge snapshot. Sampled legal responses also returned the expected localized `x-matched-path` values.

## Runtime security/privacy observations

Sampled production responses exposed the expected defensive headers, including:

- HSTS with `max-age=63072000; includeSubDomains; preload`;
- `x-frame-options: DENY`;
- `x-content-type-options: nosniff`;
- a restrictive CSP with `object-src 'none'`, `base-uri 'self'` and `frame-ancestors 'none'`;
- a restrictive Permissions Policy for camera, microphone, geolocation, payment, USB, magnetometer and gyroscope.

The deployed Security surface preserves conservative non-claims: no SOC 2 certification, no ISO 27001 certification and no completed independent penetration test are claimed without supporting evidence.

## Cookie / analytics consent evidence boundary

The production Cookie Policy is publicly reachable in both locales and exposes customer-facing controls to allow optional analytics or decline/withdraw analytics. The deployed client bundle contains the consent-gated PostHog implementation and conservative defaults such as disabled autocapture, disabled automatic pageview capture, session recording disabled by default and masking controls.

However, this closure stream did not obtain provider-side proof of the exact production value of `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT`, and browser automation capable of proving a fresh-session pre-consent network state was not available in the execution environment. The repository's enterprise evidence builder validates consent behavior under a protected synthetic CI configuration; its own evidence boundary explicitly does not prove production PostHog ingestion/configuration.

Therefore:

`ANALYTICS_CONSENT_LIVE_FLAG: OPEN`

Do not promote that subgate to PASS from code, bundle inspection or synthetic CI alone.

## HUMAN BLOCKER — founder facts and qualified legal review

Domain: Legal publication / contracting  
Requirement: final legally accurate 8/8 documents  
Why human/external action is required: engineering cannot invent entity, governing-law, contracting, provider-DPA/SCC, transfer-mechanism or counsel decisions.  
Exact action: complete the founder factual record, provide active-provider contractual/transfer evidence, have qualified counsel review the exact final document set and approve or correct it, then bind acceptance to exact document versions/SHA.  
Required artefact: completed founder factual record plus identifiable qualified-counsel decision and approved final documents.  
Acceptance evidence: all eight items have final version, effective date, correct entity/product facts, production URL verified, provider/transfer reconciliation and any required counsel approval.

## Remaining technical follow-up

The known post-merge public-route requirement is closed. Remaining technical evidence work in this stream is limited to evidence that can be obtained without substituting for legal judgment:

- prove the effective LIVE analytics-consent configuration from Vercel/runtime or a clean browser/network capture;
- revalidate the legal public-route matrix whenever the production release materially changes before final legal sign-off;
- preserve the public non-claims until external evidence exists.

Only after the human legal evidence exists can `LEGAL_8_OF_8: PASS` be emitted.