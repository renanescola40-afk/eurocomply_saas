#!/usr/bin/env node
/** Offline structural check; no assertion of CPA acceptance or SOC 2 compliance. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const entry = fileURLToPath(import.meta.url);
const defaultPath = resolve(dirname(entry), '../../docs/assurance/iso27001-soc2/soc2-common-criteria-evidence-matrix.csv');
const schema = ['criteria_group','topic','evidence_needed','related_gates','candidate_source','evidence_review_status','control_owner','reviewed_at','notes'];
export function verifySoc2Matrix(value) {
  const lines = value.trim().split(/\r?\n/);
  const head = lines.shift();
  if (head !== schema.join(',')) throw Error('Incorrect SOC 2 matrix schema');
  const seen = new Set(); let verified = 0;
  for (const line of lines) {
    const fields=line.split(',');
    if (fields.length !== schema.length) throw Error('Invalid column count');
    const [id,topic,needed,gates,source,status,owner,reviewedAt] = fields.map(x=>x.trim());
    if (!/^CC[1-9]$/.test(id) || seen.has(id)) throw Error('Duplicate or unexpected criteria group: '+id);
    if (!topic || !needed || !source || !/^G\d{2}(;G\d{2})*$/.test(gates)) throw Error('Incomplete candidate mapping: '+id);
    if (!['NOT_VERIFIED','PARTIAL','EVIDENCE_REVIEWED'].includes(status)) throw Error('Unrecognized evidence status: '+id);
    if (status==='EVIDENCE_REVIEWED') {
      if (!owner || owner==='UNASSIGNED' || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) throw Error('Evidence status missing named reviewer and date: '+id);
      verified++;
    }
    seen.add(id);
  }
  for(let i=1;i<=9;i++)if(!seen.has('CC'+i))throw Error('Missing SOC 2 common criteria group: CC'+i);
  if (seen.size!==9)throw Error('Expected 9 common criteria groups');
  return {common_criteria_groups_present:seen.size,group_rows_marked_reviewed:verified,group_rows_not_reviewed:9-verified,criteria_population_is_not_tested:true,independent_soc2_report_issued_by_this_check:false,overall_soc2_readiness_percentage:null};
}
if(process.argv[1] && resolve(process.argv[1])===entry){
try{console.log(JSON.stringify(verifySoc2Matrix(readFileSync(resolve(process.argv[2]??defaultPath),'utf8')),null,2))}
catch(e){console.error(e.message);process.exitCode=1}
}
