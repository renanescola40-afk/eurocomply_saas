'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ROLES,selectSpecialists}=require('../../scripts/agents/select-specialists.cjs');

test('all nine authorized profiles are routable',()=>{
  assert.equal(ROLES.length,9);
  for(const role of ROLES){
    const result=selectSpecialists({labels:['senior-agent','agent:ready',`agent:role:${role}`]});
    assert.equal(result.lead,role);
    assert.equal(result.profile,`.github/agents/${role}.agent.md`);
    assert.equal(result.dispatchesModel,false);
    assert.equal(result.reviewers.includes(role),false);
  }
});

test('defaults are deterministic and do not imply model execution',()=>{
  assert.equal(selectSpecialists({labels:[]}).lead,'master-cto');
  assert.equal(selectSpecialists({labels:['type:ci']}).lead,'devops');
  assert.equal(selectSpecialists({labels:['type:security']}).lead,'security');
  assert.equal(selectSpecialists({labels:['type:bug']}).lead,'developer');
});

test('authorized issue body can select a domain lead',()=>{
  assert.equal(selectSpecialists({body:'Goal: reconcile RLS\\nAgent: database',labels:['agent:ready']}).lead,'database');
  assert.equal(selectSpecialists({body:'Agent Profile: compliance'}).lead,'compliance');
});

test('conflicting or unknown explicit roles fail closed',()=>{
  assert.throws(()=>selectSpecialists({labels:['agent:role:security'],body:'Agent: billing'}),/Conflicting/);
  assert.throws(()=>selectSpecialists({labels:['agent:role:root'] }),/Unknown/);
  assert.throws(()=>selectSpecialists({body:'Agent: admin'}),/Unknown/);
});

test('high-risk queue gets reviewer candidates, never automatic approvals',()=>{
  const result=selectSpecialists({labels:['type:ci','priority:p0','risk:high']});
  assert.equal(result.highRisk,true);
  assert.deepEqual(result.reviewers,['security','release-manager']);
  assert.equal(result.dispatchesModel,false);
});

test('issue JSON must have an object boundary',()=>{
  assert.throws(()=>selectSpecialists(null),/Issue must/);
  assert.throws(()=>selectSpecialists('security'),/Issue must/);
});
