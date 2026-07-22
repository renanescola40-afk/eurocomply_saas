#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const sha = process.env.GITHUB_SHA || process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Exact lowercase 40-character SHA required');
const registry = JSON.parse(fs.readFileSync('docs/compliance/evidence/qualified-review-campaign-registry.json','utf8'));
const acceptedDir = 'docs/compliance/evidence/accepted';
const banned = /\b(todo|tbd|placeholder|example only|synthetic)\b/i;
const now = Date.now();
const results = registry.requirements.map((req) => {
  const file = path.join(acceptedDir, `${req.id}-qualified-review.json`);
  const failures = [];
  if (!fs.existsSync(file)) return {...req,status:'MISSING',failures:['file_missing']};
  let data;
  try { data = JSON.parse(fs.readFileSync(file,'utf8')); } catch { return {...req,status:'INVALID',failures:['invalid_json']}; }
  const text = JSON.stringify(data);
  if (banned.test(text)) failures.push('placeholder_content');
  if (data.schema !== 'risck-comply.qualified-review-assurance.v1') failures.push('schema_mismatch');
  if (data.requirementId !== req.id) failures.push('requirement_mismatch');
  if (data.reviewedSha !== sha) failures.push('sha_mismatch');
  if (!data.reviewer?.name || !data.reviewer?.organization || !data.reviewer?.contact) failures.push('reviewer_identity_missing');
  if (!data.qualification?.title || !data.qualification?.jurisdictionOrDiscipline || !Array.isArray(data.qualification?.evidence) || data.qualification.evidence.length === 0) failures.push('qualification_missing');
  if (data.independence?.conflictChecked !== true || data.independence?.conflictFound !== false || String(data.independence?.statement || '').length < 20) failures.push('independence_not_proven');
  if (!['APPROVED','APPROVED_WITH_LIMITATIONS'].includes(data.decision)) failures.push('decision_not_accepted');
  if (!Number.isFinite(Date.parse(data.reviewedAt)) || !Number.isFinite(Date.parse(data.validUntil))) failures.push('dates_invalid');
  else if (Date.parse(data.validUntil) <= now) failures.push('review_expired');
  if (!/^sha256:[a-f0-9]{64}$/.test(data.evidenceDigest || '')) failures.push('digest_invalid');
  return {...req,status:failures.length ? 'INVALID' : 'ACCEPTED',failures};
});
const acceptedWeight = results.filter(r=>r.status==='ACCEPTED').reduce((s,r)=>s+r.weight,0);
const totalWeight = results.reduce((s,r)=>s+r.weight,0);
const report = {schema:'risck-comply.qualified-review-campaign-report.v1',sha,acceptedWeight,totalWeight,coveragePercent:Math.round(acceptedWeight/totalWeight*100),decision:acceptedWeight===totalWeight?'QUALIFIED_REVIEW_GO':'QUALIFIED_REVIEW_NO_GO',results};
fs.mkdirSync('artifacts/qualified-review',{recursive:true});
fs.writeFileSync('artifacts/qualified-review/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if (report.decision !== 'QUALIFIED_REVIEW_GO') process.exitCode = 1;
