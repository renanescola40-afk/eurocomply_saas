# Legal 8/8 closure evidence

Prepared: 2026-08-21  
Production subject observed: `https://www.risckcomply.com`  
Production main SHA observed: `7c063edbd73e719024666b7740623455aae20f0d`  
Production deployment observed: `dpl_rbbHqrqcXWfAchSZs46ZeLoYZETw`

## Canonical rubric decision

No repository definition named `LEGAL_8_OF_8` or `Legal 8/8` was found. The repository does contain a separate fail-closed legal-review authority with eight qualified review packages, founder-fact requirements and counsel evidence. That authority is preserved. For this closure stream the baseline rubric is therefore:

1. Terms of Service
2. Privacy Policy
3. DPA
4. International Data Transfers / SCC annex
5. Cookie Policy
6. Subprocessor List
7. Acceptable Use Policy
8. Security & Compliance / TOMs

## Gate result

`LEGAL_8_OF_8: HUMAN_BLOCKER`

Eight technical/public surfaces are not equivalent to eight legally approved documents. Existing repository truth requires founder facts and qualified legal acceptance before final publication/contracting claims. The preparation branch also contains runtime changes that are not production evidence until merged and deployed.

## 8/8 matrix

| # | ITEM | SOURCE / SURFACE | VERSION / EFFECTIVE DATE | RUNTIME | COUNSEL / EXTERNAL EVIDENCE | STATUS |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Terms | `src/app/[locale]/terms/page.tsx`; counsel pack Terms draft | current page is an unversioned production draft | `/pt/terms` returned 200 on observed production release | founder facts and qualified review unresolved | HUMAN_BLOCKER |
| 2 | Privacy | trust-center privacy surface + Privacy review draft | public trust content is informational; final version/effective date not approved | public route exists; exact post-merge revalidation required | founder/controller facts and qualified review unresolved | HUMAN_BLOCKER |
| 3 | DPA | trust-center DPA surface + DPA review draft | public page is a summary, not signed final DPA | public route exists; exact post-merge revalidation required | final DPA terms/signature/qualified review unresolved | HUMAN_BLOCKER |
| 4 | SCC / Transfers | `src/app/[locale]/transfers/page.tsx` on this branch | `0.1-review`; effective date pending legal approval | NOT PRODUCTION VERIFIED for branch head | provider contractual mechanisms/SCC evidence not verified | HUMAN_BLOCKER |
| 5 | Cookie Policy | `src/app/[locale]/cookie-policy/page.tsx` on this branch | `0.1-review`; effective date pending legal approval | observed production `/pt/cookie-policy` redirected to login before this fix; branch NOT PRODUCTION VERIFIED | final provider/retention/config reconciliation and qualified review unresolved | HUMAN_BLOCKER |
| 6 | Subprocessors | trust-center subprocessor register + counsel-pack draft | informational/review-draft state | public route exists; exact active-provider reconciliation required | active provider DPA/location/transfer evidence incomplete | HUMAN_BLOCKER |
| 7 | Acceptable Use | `src/app/[locale]/acceptable-use/page.tsx` on this branch | `0.1-review`; effective date pending legal approval | NOT PRODUCTION VERIFIED for branch head | final Terms relationship and qualified review unresolved | HUMAN_BLOCKER |
| 8 | Security / TOMs | `/security`, trust documentation and security controls | disclosure surface is conservative, not a signed TOM exhibit | public route exists; exact post-merge revalidation required | final TOM exhibit/counsel review and independent pentest evidence unresolved | HUMAN_BLOCKER |

## Technical changes in this branch

- adds public, localized review surfaces for Cookie Policy, Acceptable Use and International Transfers;
- keeps those routes public in both middleware and the server-side commercial-route authority without weakening the default paid-product fail-closed rule;
- makes the consent banner link directly to Cookie Policy;
- exposes consent allow/decline/withdraw controls on the Cookie Policy page;
- version-tags the new review documents and marks them `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`;
- adds regression tests that protect public route classification and fail-closed legal publication language;
- adds the independent pentest handoff package.

## Current runtime observation

On production deployment `dpl_rbbHqrqcXWfAchSZs46ZeLoYZETw` / main SHA `7c063edbd73e719024666b7740623455aae20f0d`:

- `https://www.risckcomply.com/pt/terms` returned HTTP 200 and visibly identified itself as production draft terms;
- `https://www.risckcomply.com/pt/cookie-policy` routed to the login surface instead of a public Cookie Policy;
- the active browser bundle contains the analytics consent gate, PostHog integration with autocapture disabled and session recording disabled by default, but the exact production value of `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT` has not been independently proven from provider configuration in this closure stream.

Therefore repository implementation is not production proof for the branch changes.

## HUMAN BLOCKER — founder facts and qualified legal review

Domain: Legal publication / contracting  
Requirement: final legally accurate 8/8 documents  
Why human/external action is required: the repository explicitly requires founder factual input and qualified legal acceptance; engineering cannot invent entity, governing-law, contracting, provider-DPA/SCC or counsel decisions.  
Exact action: complete the founder factual record, provide active provider contractual/transfer evidence, have qualified counsel review the exact final document set and approve or correct it, then bind acceptance to the exact document versions/SHA.  
Required artefact: completed founder factual record plus identifiable qualified counsel decision/approved final documents.  
Acceptance evidence: all eight items have final version, effective date, correct entity/product facts, production URL verified, provider/transfer reconciliation, and any required counsel approval.  
Technical work continuing: this branch closes known public-route/consent/handoff gaps without asserting legal approval.

## Post-merge runtime verification required

After this branch is approved, merged and deployed, re-test at minimum:

- footer -> Terms, Privacy, Cookie Policy, DPA, Subprocessors, Acceptable Use, Transfers, Security;
- direct unauthenticated HTTP 200 for each route in at least `pt` and `en`;
- mobile rendering and locale continuity;
- Cookie Policy settings can allow and withdraw optional analytics;
- optional analytics does not initialize before consent when production policy requires consent;
- no critical placeholders or false certification/pentest/counsel claims.

Only after those runtime checks and the human legal evidence exist can `LEGAL_8_OF_8: PASS` be emitted.
