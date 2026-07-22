#!/usr/bin/env node
import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync('artifacts/qualified-review/report.json','utf8'));
const rows = [...report.results].sort((a,b)=>b.weight-a.weight).map(r=>`| ${r.requirementId || r.id} | ${r.weight} | ${r.status} | ${(r.failures||[]).join(', ') || '—'} |`);
const md = [`# Qualified Review Campaign Gap Report`,``,`Exact SHA: \`${report.sha}\``,``,`Accepted weighted coverage: **${report.acceptedWeight}/${report.totalWeight} (${report.coveragePercent}%)**`,``,`Decision: **${report.decision}**`,``,`| Requirement | Weight | Status | Blockers |`,`|---|---:|---|---|`,...rows,'',`Generated from machine-readable evidence; no legal or certification claim is created.`].join('\n');
fs.writeFileSync('artifacts/qualified-review/report.md',md);
console.log(md);
