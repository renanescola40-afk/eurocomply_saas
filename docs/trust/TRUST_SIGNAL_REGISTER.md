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

## Submission received / owner confirmation pending

### CSA STAR for AI Level 1 — AI-CAIQ v1.1.0 self-assessment
- Status: **SUBMISSION RECEIVED / EMAIL CONFIRMATION + ORGANIZATION/SERVICE COMPLETION PENDING**.
- Assessment: 320/320 questions answered; 320/320 SSRM ownership assigned.
- CSA confirmation email was received at `comercial@risckcomply.com` and requires the owner to select `Confirm Submission`, then select/create the organization and cloud service before the entry is fully completed.
- Type: Level 1 self-assessment, not independent certification.
- Safe public wording only after registry listing: `CSA STAR for AI Level 1 — AI-CAIQ Self-Assessment listed in the CSA STAR Registry.`
- Forbidden wording: `CSA Certified`.
- Future placement after public listing: Procurement = YES; buyer PDF = YES; Trust Center/site = YES.

## Active registry preparation

### CSA STAR Level 1 — CAIQ-Lite v4.1
- Status: **PRE-SUBMISSION / EVIDENCE MAPPING STARTED**.
- Current CSA framework: 96 selected CCM v4.1 controls and 138 focused CAIQ-Lite questions across 17 domains.
- Current CSA Registry listings publish `CAIQ Lite Self-assessment v4.1.0` under STAR Level 1.
- RISCK COMPLY readiness is tracked in PR #1970.
- Exact official workbook is required before final response population; official questionnaire text will not be reconstructed or invented.
- Type: Level 1 cloud-security self-assessment, not independent certification.
- Future placement after listing: Procurement = HIGH PRIORITY; buyer PDF = YES; Trust Center/site = YES.
- Strategic value: complements STAR for AI with general cloud-security and privacy-control transparency.

## Measured / improvement in progress

### Public accessibility automated baseline — Google Lighthouse 13.4.1
- Dated Production run: 2026-09-06.
- `/en/pricing`: **96/100**.
- `/en/security`: **96/100**.
- `/en/trust`: **96/100**.
- `/en`: **94/100**.
- Primary automated findings: color contrast; homepage additionally has a heading-order finding.
- Status: **STRONG BASELINE / REMEDIATION IN PROGRESS**.
- Claim boundary: automated Lighthouse testing is not WCAG certification or complete conformance proof.
- Future placement: Procurement = YES as dated technical evidence; PDF = likely after remediation/manual review; website = Accessibility Statement only after evidence-backed WCAG evaluation.

### MDN HTTP Observatory
- Baseline: **B / 75**; 10/12 checks passed.
- Remaining findings: CSP `unsafe-inline`; `NEXT_LOCALE` cookie lacks `Secure` in the current public release.
- Secure-cookie remediation has started on an isolated branch; no improved public grade is claimed until release and rescan.
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
- Automated baseline is already 94–96/100 across four public pages.
- Next work: remediate automated findings and perform manual checks needed for a defensible accessibility statement/conformance position.
- This is not a W3C certification.
- Future placement: Procurement = YES; buyer PDF = YES when evidence-backed; website = Accessibility Statement rather than a fake certification badge.

## Selection policy for final buyer materials

1. Procurement may include dated technical assurance evidence with exact scope and caveats.
2. Buyer PDF should prioritize recognized, strong, current and independently verifiable items.
3. Website/Trust Center should show only items that materially increase buyer confidence and are visually/legal-safe.
4. Never convert a self-assessment, scanner grade, public technical check or voluntary pledge into a third-party certification claim.
5. Keep source URLs, report dates, scores, versions and retest dates with every claim.
6. Recheck time-sensitive ratings immediately before procurement/PDF publication.
7. Weak scores remain internal/remediation evidence rather than being promoted simply to increase badge count.

## Current priority order

1. CSA STAR for AI Level 1 — owner completes email confirmation + organization/service selection, then verify public registry listing.
2. CSA STAR Level 1 / CAIQ-Lite v4.1 — obtain exact official workbook, populate conservatively and submit when ready.
3. Green Web Foundation — retain as confirmed public trust signal.
4. Accessibility — close automated findings, then perform manual WCAG review and prepare Accessibility Statement.
5. Raise MDN Observatory from B/75 toward A/A+ without weakening runtime security.
6. Obtain a current Qualys SSL Labs result and promote only if strong.
7. Improve Internet.nl website/email where changes are safe and controllable.
8. Raise OpenSSF Scorecard before any public badge.
