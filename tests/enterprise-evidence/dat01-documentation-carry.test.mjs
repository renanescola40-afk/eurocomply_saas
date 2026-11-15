import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {docsPacketIntegrity} from '../../scripts/enterprise-evidence/validate-evidence.mjs';

const indexPath='docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
const packetPath='docs/enterprise/phase1-v22/DAT01_48_CASE_TECHNICAL_DECISION_PACKET_20261114.json';
const validatorPath='scripts/enterprise-evidence/validate-evidence.mjs';
const proofs=[
 'docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v34/A15_QAT01_FORMAL_ACCEPTANCE_PROOF.json',
 'docs/enterprise/gate-closure-v35/A19_OPS02_ACCEPTANCE_PROOF.json',
];

test('documentation-only carry freezes four-gate evidence and refuses unsigned case decisions, replay and source changes',()=>{
 const root=mkdtempSync(join(tmpdir(),'risck-docs-carry-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const write=(p,s)=>{const dest=join(root,p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,s);};
 const commit=(message)=>{git('add','.');git('commit','-qm',message);return git('rev-parse','HEAD');};
 try{
  git('init','-q');
  git('config','user.email','test@invalid.example');
  git('config','user.name','Test');
  const index={
   cumulative_acceptance:{schema:'risck-comply.a15-cumulative-acceptance.v1'},
   gates:[
    {gate_id:'A-09',accepted:true,acceptance_evidence_ref:proofs[0]},
    {gate_id:'A-15',accepted:true,acceptance_evidence_ref:proofs[1]},
    {gate_id:'A-18',accepted:true,acceptance_evidence_ref:proofs[0]},
    {gate_id:'A-19',accepted:false,acceptance_evidence_ref:proofs[2]},
   ],evidence_records:[],
  };
  write(indexPath,JSON.stringify(index));
  for(const p of proofs)write(p,'immutable proof data');
  const checkpoint=commit('accepted gate checkpoint');
  const packet={
   checkpointSha:checkpoint,formalA12:'BLOCKED',replayAuthorization:'NOT_GRANTED',
   counts:{reviewCases:48,genuinelyResolvedByQualifiedDecision:0,requiringQualifiedDecision:48},
   cases:Array.from({length:48},(_,i)=>({
    caseId:'DAT01-'+String(i+1).padStart(3,'0'),
    qualifiedDisposition:'PENDING',reviewer:null,replayAuthorized:false,
   })),
  };
  const packetText=JSON.stringify(packet);
  write(packetPath,packetText);
  write(validatorPath,'reviewed narrow admission');
  const good=commit('add pending review packet');
  const options={expectedSha:good,root,checkpoint};
  assert.equal(docsPacketIntegrity(index,options),true);
  assert.equal(docsPacketIntegrity(index,{...options,expectedSha:checkpoint}),false);
  write(packetPath,JSON.stringify({...packet,replayAuthorization:'GRANTED'}));
  const granted=commit('attempt unreviewed replay');
  assert.equal(docsPacketIntegrity(index,{...options,expectedSha:granted}),false);
  write(packetPath,packetText);
  const restored=commit('restore replay prohibition');
  assert.equal(docsPacketIntegrity(index,{...options,expectedSha:restored}),true);
  write(proofs[2],'tampered OPS-02 acceptance proof');
  const tampered=commit('attempt proof mutation');
  assert.equal(docsPacketIntegrity(index,{...options,expectedSha:tampered}),false);
  write('src/production.ts','unexpected application change');
  const sourceChanged=commit('attempt source change');
  assert.equal(docsPacketIntegrity(index,{...options,expectedSha:sourceChanged}),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
