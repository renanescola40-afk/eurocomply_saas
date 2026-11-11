#!/usr/bin/env node
// Review-intake contract only. Never converts an APPROVED GitHub review into
// security, source provenance, A-12, merge, or replay acceptance.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const DISPOSITIONS = new Set([
  'ACCEPTED WITH VERIFIED EVIDENCE',
  'DOCUMENTED EXCEPTION ACCEPTED',
  'REMEDIATION REQUIRED',
  'BLOCKED — INSUFFICIENT EVIDENCE',
  'BLOCKED - INSUFFICIENT EVIDENCE',
]);
const fields = [
  'Review target SHA', 'Case ID', 'Provider migration version', 'Source provenance',
  'Version mapping', 'Security assessment', 'Evidence references',
  'Independent disposition', 'Technical rationale', 'Reviewer',
  'Review date', 'Replay authorization', 'Formal A-12 acceptance',
];
const shaRE = /^[0-9a-f]{40}$/;
const placeholderRE = /\[[^\]]{1,120}\]|<[^>]+>|\b(?:TBD|TODO|FILL\s+ME|PLACEHOLDER|N\/A\s+TO\s+BE\s+DECIDED)\b/i;

function fieldMap(text) {
  const out = Object.create(null);
  for (const line of text.split(/\r?\n/)) {
    const parsed = line.match(/^\s*(?:\*\*)?([A-Za-z0-9 /-]+):(?:\*\*)?\s*(.+?)\s*$/);
    if (!parsed) continue;
    const key = parsed[1].trim();
    const value = parsed[2].replace(/^\*+|\*+$/g, '').trim();
    if (fields.includes(key) && out[key] !== undefined) return null;
    if (fields.includes(key)) out[key] = value;
  }
  return out;
}

function checkedCase(review, headSha, manifestById, ownerLogin) {
  if (!review || review.state !== 'APPROVED' ||
    review.commit_id !== headSha ||
    !review.user?.login ||
    review.user.login.toLowerCase() === ownerLogin.toLowerCase())
    return { valid: false, reason: 'NATIVE_REVIEW_IDENTITY_OR_SHA' };
  if (!review.body || placeholderRE.test(review.body))
    return { valid: false, reason: 'PLACEHOLDERS_OR_EMPTY_BODY' };
  const data = fieldMap(review.body);
  if (!data || fields.some(key => !data[key]))
    return { valid: false, reason: 'REQUIRED_FIELDS_MISSING_OR_DUPLICATE' };
  const c = manifestById.get(data['Case ID']);
  if (!c || data['Provider migration version'] !== c.providerVersion ||
    data['Review target SHA'] !== headSha)
    return { valid: false, reason: 'CASE_OR_SHA_IDENTITY_MISMATCH' };
  const reviewer = data['Reviewer'].replace(/^@/, '');
  if (reviewer.toLowerCase() !== review.user.login.toLowerCase() ||
      !/^\d{4}-\d\d-\d\d$/.test(data['Review date']))
    return { valid: false, reason: 'REVIEWER_OR_DATE_MISMATCH' };
  if (!DISPOSITIONS.has(data['Independent disposition']) ||
    !/^NOT GRANTED(?: BY THIS CASE-LEVEL REVIEW)?$/i.test(data['Replay authorization']) ||
    !/^PENDING\b/i.test(data['Formal A-12 acceptance']))
    return { valid: false, reason: 'INVALID_DISPOSITION_OR_UNAUTHORIZED_REPLAY' };
  if (data['Source provenance'].length < 45 ||
    data['Version mapping'].length < 35 ||
    data['Security assessment'].length < 50 ||
    data['Technical rationale'].length < 75 ||
    !data['Evidence references'].includes(c.appliedSqlSha256) ||
    !/(https:\/\/github\.com\/|[0-9a-f]{40})/.test(data['Evidence references']))
    return { valid: false, reason: 'INSUFFICIENT_CASE_EVIDENCE' };
  return { valid: true, caseId:c.caseId, version:c.providerVersion,
    disposition:data['Independent disposition'],
    reviewer:review.user.login,
    submittedAt:review.submitted_at || null };
}

export function summarizeDat01NativeReviews({ headSha, triage, reviews, ownerLogin } = {}) {
  if (!shaRE.test(headSha || '') ||
    !Array.isArray(triage?.cases) || triage.cases.length !== 48 ||
    !Array.isArray(reviews) || typeof ownerLogin !== 'string' || !ownerLogin.trim())
    throw new Error('DAT01_REVIEW_INTAKE_INVALID_INPUT');
  const manifestById = new Map(triage.cases.map(c => [c.caseId,c]));
  if (manifestById.size !== 48 ||
    triage.cases.some(c => !/^DAT01-\d{3}$/.test(c.caseId) || !/^\d{14}$/.test(c.providerVersion) ||
      !/^[a-f0-9]{64}$/.test(c.appliedSqlSha256) ||
      c.humanReview?.independentlyAccepted !== false ||
      c.replayAuthorized !== false))
    throw new Error('DAT01_REVIEW_INTAKE_BAD_CASE_MATRIX');
  const seen = new Map(), rejects = Object.create(null);
  for (const review of reviews) {
    const r = checkedCase(review, headSha, manifestById, ownerLogin);
    if (!r.valid) { rejects[r.reason] = (rejects[r.reason] || 0) + 1; continue; }
    // Retain the most recently submitted eligible native review for a case.
    const current = seen.get(r.caseId);
    if (!current || String(r.submittedAt) > String(current.submittedAt)) seen.set(r.caseId,r);
  }
  const cases = [...seen.values()].sort((a,b)=>a.caseId.localeCompare(b.caseId));
  const acceptedDispositionClaims = cases.filter(x =>
    ['ACCEPTED WITH VERIFIED EVIDENCE','DOCUMENTED EXCEPTION ACCEPTED'].includes(x.disposition)).length;
  const blockedOrRemediation = cases.length - acceptedDispositionClaims;
  return {
    schema:'risck-comply.dat01.native-review-intake-preflight.v1',
    checkedSourceSha:headSha,
    caseCount:48,
    githubReviewSubmissionsInspected:reviews.length,
    structurallyCompleteCaseSubmissions:cases.length,
    acceptedDispositionClaimsNotIndependentlyVerified:acceptedDispositionClaims,
    structurallyCompleteBlockedOrRemediation:blockedOrRemediation,
    remainingCasesWithoutStructuredSubmission:48-cases.length,
    rejectedSubmissionsByReason:rejects,
    submittedCaseIds:cases.map(x=>x.caseId),
    qualifiedTechnicalAcceptanceGranted:false,
    replayAuthorized:false,
    formalGateA12:'BLOCKED',
    note:'Syntactic completeness of a native GitHub review is NOT technical/qualified acceptance. Independent source/security review and isolated PG17 rehearsal are separate requirements.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error('DAT01_REVIEW_INTAKE_NO_INPUT: supply a private native GitHub PR reviews JSON file; never send a GitHub token to CI');
    process.exitCode = 2;
  } else {
    try {
      const input = JSON.parse(readFileSync(path,'utf8'));
      const output = summarizeDat01NativeReviews(input);
      process.stdout.write(JSON.stringify(output,null,2)+'\n');
    } catch (e) {
      console.error(e.message || 'DAT01_REVIEW_INTAKE_FAILED');
      process.exitCode = 2;
    }
  }
}
