#!/usr/bin/env node
import fs from 'node:fs';
const registry = JSON.parse(fs.readFileSync('docs/compliance/evidence/qualified-review-campaign-registry.json','utf8'));
const rosterPath = process.argv[2] || 'docs/compliance/evidence/staging/reviewer-roster.json';
const roster = fs.existsSync(rosterPath) ? JSON.parse(fs.readFileSync(rosterPath,'utf8')) : {reviewers:[]};
const now = new Date().toISOString().slice(0,10);
const assignments = registry.requirements.map(req => {
  const candidates = roster.reviewers.filter(r => r.activeFrom <= now && r.activeUntil >= now && r.disciplines.some(d => req.scope.toLowerCase().includes(d.toLowerCase())));
  return {requirementId:req.id,weight:req.weight,candidateReviewerIds:candidates.map(r=>r.id),status:candidates.length?'ASSIGNABLE':'NO_QUALIFIED_REVIEWER'};
});
const report={schema:'risck-comply.review-assignment-matrix.v1',generatedAt:new Date().toISOString(),assignments};
fs.mkdirSync('artifacts/qualified-review',{recursive:true});
fs.writeFileSync('artifacts/qualified-review/assignment-matrix.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
