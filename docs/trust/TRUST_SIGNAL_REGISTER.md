# RISCK COMPLY — Trust Signal & Certification Register

**Status date:** 2026-09-06  
**Purpose:** canonical evidence register for future procurement pack, buyer-facing PDF, Trust Center and website claims.

## Publication rule

No item is described as a certification unless the issuing body actually certifies it. Technical scans, self-assessments and voluntary pledges remain labeled as such. Every externally visible claim must preserve exact scope, date, score/version and evidence source.

## Confirmed / obtained

### Green Web Foundation — Green hosting verified
- Subject: `risckcomply.com`
- Status: **CONFIRMED**
- Type: independent public hosting/sustainability verification signal; not an enterprise sustainability certification.
- Safe claim: `Green Web Foundation — green hosting verified for risckcomply.com.`
- Future placement: Procurement = YES; buyer PDF = YES; Trust Center/site = YES.

## Submitted / awaiting external publication

### CSA STAR for AI Level 1 — AI-CAIQ v1.1.0 self-assessment
- Status: **SUBMITTED / AWAITING REGISTRY PUBLICATION**
- Assessment: 320/320 questions answered; 320/320 SSRM ownership assigned.
- Type: Level 1 self-assessment, not independent certification.
- Safe public wording only after registry listing: `CSA STAR for AI Level 1 — AI-CAIQ Self-Assessment listed in the CSA STAR Registry.`
- Forbidden wording: `CSA Certified`.
- Future placement after public listing: Procurement = YES; buyer PDF = YES; Trust Center/site = YES.

## Measured / improvement in progress

### MDN HTTP Observatory
- Baseline: **B / 75**; 10/12 checks passed.
- Remaining findings: CSP `unsafe-inline`; `NEXT_LOCALE` cookie lacks `Secure` in the current public release.
- Status: **IMPROVEMENT IN PROGRESS**.
- Future placement: Procurement = YES as dated evidence; buyer PDF/site only when score is strong/current and wording remains scoped.

### Internet.nl Website
- Baseline: **75%**.
- IPv6 and RPKI passed.
- DNSSEC and edge TLS/security-option findings remain.
- Status: **IMPROVEMENT IN PROGRESS**.
- Future placement: Procurement = YES; PDF/site only after a materially stronger result.

### Internet.nl Email
- Baseline: **69%**.
- IPv6 and RPKI passed.
- Email-authentication, DNSSEC and TLS categories remain incomplete; provider-controlled and domain-controlled findings must remain separated.
- Status: **IMPROVEMENT IN PROGRESS**.
- Future placement: Procurement = YES as technical evidence; PDF/site only after material improvement.

### OpenSSF Scorecard
- Measured local preview: **4.6/10**.
- Strong checks include Security Policy, SAST, Dependency Update Tool and Binary Artifacts.
- Weak areas include token permissions, dangerous workflow pattern, fuzzing, vulnerabilities and incomplete action pinning.
- Public result/badge not yet resolved.
- Status: **REMEDIATION BEFORE PROMOTION**.
- Future placement: Procurement = internal evidence now; PDF/site only after a materially stronger public score.

## Next free / quick targets

### Qualys SSL Labs
- Target: public SSL/TLS server rating for `www.risckcomply.com`.
- Desired promotion threshold: A or A+.
- Status: **NEXT**.
- Note: the free browser service is suitable for owner testing; automated commercial API use must respect Qualys API terms and is not assumed.
- Future placement: Procurement = YES; buyer PDF/site = YES only for a strong current result.

### WCAG 2.2 accessibility self-evaluation / Accessibility Statement
- Framework: W3C WCAG conformance evaluation and Accessibility Statement.
- Status: **CANDIDATE — EVIDENCE REQUIRED BEFORE CLAIM**.
- This is not a W3C certification.
- Future placement: Procurement = YES; buyer PDF = YES when evidence-backed; website = accessibility statement rather than a fake certification badge.

## Selection policy for final buyer materials

1. Procurement may include dated technical assurance evidence with exact scope and caveats.
2. Buyer PDF should prioritize recognized, strong, current and independently verifiable items.
3. Website/Trust Center should show only items that materially increase buyer confidence and are visually/legal-safe.
4. Never convert a self-assessment, scanner grade, public technical check or voluntary pledge into a third-party certification claim.
5. Keep source URLs, report dates, scores, versions and retest dates with every claim.
6. Recheck time-sensitive ratings immediately before procurement/PDF publication.

## Current priority order

1. CSA STAR for AI Level 1 — verify public registry listing.
2. Green Web Foundation — retain as confirmed public trust signal.
3. Raise MDN Observatory from B/75 toward A/A+ without weakening runtime security.
4. Obtain a current Qualys SSL Labs result and promote only if strong.
5. Improve Internet.nl website/email where changes are safe and controllable.
6. Raise OpenSSF Scorecard before any public badge.
7. Build a defensible WCAG Accessibility Statement only after real evaluation.
