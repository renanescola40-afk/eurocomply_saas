#!/usr/bin/env node
/**
 * RISCK COMPLY M&A evidence-score audit.
 * Read-only, zero-cost, fail closed when any numbered requirement or subtotal differs.
 * Run: node scripts/ma/validate-ma-evidence-score.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const file = resolve(process.cwd(), 'docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md');
const source = readFileSync(file, 'utf8');
const expected = [['Corporate',17],['IP ownership',20],['Financial',26],['Tax',12],['Commercial',15],['Providers',8]];
const rows = [];
let domain = '';
for (const line of source.split(/\r?\n/)) {
  const h = line.match(/^## (Corporate|IP ownership|Financial|Tax|Commercial|Providers)\b/);
  if (h) domain = h[1];
  const match = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*(CLOSED|PARTIAL|OPEN)\s*\|\s*(0(?:\.0)?|0\.5|1(?:\.0)?)\s*\|/);
  if (match) rows.push({id:Number(match[1]),domain,status:match[3],credit:Number(match[4])});
}
const problems = [];
const ids = new Set(rows.map(x => x.id));
if (rows.length !== 98 || ids.size !== 98) problems.push('Expected 98 unique requirement rows');
for (let id=1; id<=98; id++) if (!ids.has(id)) problems.push('Missing requirement '+id);
for (const r of rows) if (r.credit !== ({CLOSED:1,PARTIAL:0.5,OPEN:0})[r.status]) problems.push('Invalid state/credit at '+r.id);
const report = [];
for (const [name,count] of expected) {
  const group = rows.filter(r=>r.domain === name);
  const actual = group.reduce((s,r)=>s+r.credit,0);
  const re = new RegExp('^'+name.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')+' subtotal: \\*\\*([0-9.]+) \\/ '+count+'\\s*=', 'm');
  const declared = source.match(re);
  if (!declared) problems.push('Missing declared subtotal: '+name);
  else if (Number(declared[1]) !== actual) problems.push(name+': row sum '+actual+' != declared '+declared[1]);
  if (group.length !== count) problems.push(name+': expected '+count+' rows, found '+group.length);
  report.push({domain:name,requirements:group.length,points:actual,declared:declared?Number(declared[1]):null});
}
const actualTotal=rows.reduce((s,r)=>s+r.credit,0);
const declaredTotals=[...source.matchAll(/^TOTAL_SCORE=([0-9.]+)(?:\/98)?\s*$/gm)].map(x=>Number(x[1]));
if (!declaredTotals.length) problems.push('No TOTAL_SCORE in source');
else if (declaredTotals.at(-1)!==actualTotal) problems.push('Latest TOTAL_SCORE '+declaredTotals.at(-1)+' differs from row sum '+actualTotal);
console.log(JSON.stringify({source:file,rows:rows.length,rowScore:actualTotal,percentage:Number((actualTotal/98*100).toFixed(2)),declaredTotals,domains:report,problems},null,2));
if (problems.length) process.exitCode = 1;
