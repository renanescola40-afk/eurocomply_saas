# RISCK COMPLY — Trust Signal & Certification Register

**Status date:** 2026-09-27  
**Purpose:** canonical evidence register for procurement, buyer-facing materials, Trust Center and website claims.

## Publication rule

No item is described as a certification unless the issuing body actually certifies it. Technical scans, self-assessments and voluntary pledges remain labeled as such. Every externally visible claim must preserve exact scope, date, score/version and evidence source.

When evidence conflicts, the most specific, attributable and most recent evidence wins. External acceptance/publication must never be inferred from internal preparation or from an earlier submission attempt.

## Confirmed / obtained

### Green Web Foundation — Green hosting verified
- Subject: `risckcomply.com`
- Status: **CONFIRMED**
- Type: independent public hosting/sustainability verification signal; not an enterprise sustainability certification.
- Safe claim: `Green Web Foundation — green hosting verified for risckcomply.com.`
- Placement: Procurement = YES; buyer PDF = YES; Trust Center/site = YES.

## Prepared / external action required

### CSA STAR for AI Level 1 — AI-CAIQ v1.1.0 self-assessment
- Status: **TECHNICAL_PREPARATION_COMPLETE / RESUBMISSION_REQUIRED**
- Assessment: 320/320 questions answered; 320/320 SSRM ownership assigned.
- Framework: AICM v1.1 / AI-CAIQ v1.1.0.
- Assessment role: Application Provider.
- Type: Level 1 self-assessment pathway; not independent certification.
- Latest attributable outcome: the 2026-09-14 submission attempt was rejected because the required confirmation process was not completed within the 48-hour window.
- Security/compliance adverse finding: **NO** — the recorded rejection was administrative timeout, not a negative security determination.
- Current external state: **RESUBMISSION_REQUIRED**.
- Public registry acceptance: **NOT VERIFIED**.
- Claim currently allowed: `RISCK COMPLY has prepared a complete AI-CAIQ v1.1.0 self-assessment for CSA STAR for AI Level 1 resubmission.`
- Claim currently forbidden: `CSA STAR for AI Level 1 listed`, `CSA certified`, `CSA approved`, `independently audited by CSA`, or any badge/designation implying registry acceptance.
- Buyer/procurement use: the completed self-assessment may be disclosed as internal/self-assessment evidence with the status above; a registry designation may be used only after a live public STAR Registry entry is verified.

### CSA STAR Level 1 — Cloud security CAIQ
- Status: **PREPARATION REQUIRED / NOT YET SUBMITTED**
- Current official target verified 2026-09-27: **CAIQ v4.1 STAR Level 1 Security Questionnaire**.
- Type: cloud-security self-assessment submission to the CSA STAR Registry; not independent certification.
- Claim currently allowed: `CSA STAR Level 1 preparation in progress.`
- Claim currently forbidden: `CSA STAR Level 1 listed`, `CSA certified`, `CSA approved`, or equivalent wording until a live registry entry exists.

## Measured / improvement in progress

### MDN HTTP Observatory
- Last recorded baseline: **B / 75**; 10/12 checks passed.
- Recorded findings: CSP `unsafe-inline`; `NEXT_LOCALE` cookie lacked `Secure` in the measured public release.
- Status: **DATED EVIDENCE — RECHECK REQUIRED BEFORE PUBLIC PROMOTION**.
- Placement: Procurement = YES as dated evidence; buyer PDF/site only after current retest and scope/date disclosure.

### Internet.nl Website
- Last recorded baseline: **75%**.
- Recorded positives: IPv6 and RPKI passed.
- Recorded gaps: DNSSEC and edge TLS/security-option findings.
- Status: **DATED EVIDENCE — RECHECK REQUIRED BEFORE PUBLIC PROMOTION**.

### Internet.nl Email
- Last recorded baseline: **69%**.
- Recorded positives: IPv6 and RPKI passed.
- Recorded gaps: email authentication, DNSSEC and TLS categories.
- Status: **DATED EVIDENCE — RECHECK REQUIRED BEFORE PUBLIC PROMOTION**.

### OpenSSF Scorecard
- Last recorded local preview: **4.6/10**.
- Strong recorded checks: Security Policy, SAST, Dependency Update Tool and Binary Artifacts.
- Weak recorded areas: token permissions, dangerous workflow pattern, fuzzing, vulnerabilities and incomplete action pinning.
- Public result/badge: **NOT VERIFIED**.
- Status: **REMEDIATION / CURRENT PUBLIC RECHECK REQUIRED BEFORE PROMOTION**.

## Next free / quick targets

### Qualys SSL Labs
- Target: `https://www.risckcomply.com`.
- Desired promotion threshold: A or A+.
- Status: **NOT YET RECORDED IN CANONICAL EVIDENCE**.
- Rule: record hostname, test date, TLS versions, certificate result and grade before any public claim.

### WCAG 2.2 accessibility self-evaluation / Accessibility Statement
- Framework: W3C WCAG 2.2 self-evaluation.
- Status: **EVIDENCE REQUIRED BEFORE CLAIM**.
- This is not a W3C certification.
- Public statement is allowed only after a defensible evaluation exists and known limitations are disclosed.

## Claim taxonomy

Use exactly one of the following categories for buyer-facing trust evidence:

- **IMPLEMENTED** — first-party control with evidence.
- **SELF_ASSESSED** — first-party assessment against an external framework.
- **PUBLICLY_VERIFIED** — current public third-party technical evidence/registry verification.
- **EXTERNALLY_ASSESSED** — attributable external assessment with defined methodology/scope.
- **CERTIFIED** — formal certification by an eligible certification body, only when objectively true.
- **PLANNED** — intended work with no assurance credit.
- **NOT_APPLICABLE** — out of scope with rationale.

Do not merge these categories. In particular:

- CSA STAR Level 1 / STAR for AI Level 1 self-assessments are not to be described as independent certification.
- Qualys/Observatory/Internet.nl results are public technical scans, not penetration tests.
- SAST/DAST/security CI are internal automated controls, not independent audits.

## Selection policy for final buyer materials

1. Procurement may include dated technical assurance evidence with exact scope and caveats.
2. Buyer materials should prioritize recognized, strong, current and independently verifiable items.
3. Website/Trust Center should show only claims that are current, material and legally safe.
4. Never convert a self-assessment, scanner grade, public technical check or voluntary pledge into a third-party certification claim.
5. Keep source URLs, report dates, scores, versions and retest dates with every claim.
6. Recheck time-sensitive ratings immediately before procurement or website publication.
7. A failed/expired administrative submission must be shown as `RESUBMISSION_REQUIRED`, not `AWAITING PUBLICATION`.

## Current priority order

1. CSA STAR for AI Level 1 — resubmit AI-CAIQ v1.1.0 and complete the human confirmation flow within the required window.
2. CSA STAR Level 1 — prepare CAIQ v4.1 using current RISCK COMPLY evidence.
3. Obtain and record a current Qualys SSL Labs result.
4. Recheck MDN Observatory and remediate safe application-controlled findings.
5. Recheck Internet.nl website/email and separate domain-controlled from provider-controlled limitations.
6. Recheck the public OpenSSF Scorecard and fix safe repository-controlled findings without gaming the score.
7. Build a defensible WCAG 2.2 self-evaluation and accessibility statement only after evidence exists.
