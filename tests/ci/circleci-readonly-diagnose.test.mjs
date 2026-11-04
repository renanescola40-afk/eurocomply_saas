import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCircleJob } from '../../scripts/ci/circleci-readonly-diagnose.mjs';
const job = (name, exit_code=1, status='failed') => ({build_num:416,status,steps:[{name,actions:[{status,exit_code,output_url:'https://example.invalid/SECRET'}]}]});
test('no execution steps cannot be called a code failure',()=>{
 const result=classifyCircleJob({build_num:416,status:'failed',steps:[]});
 assert.equal(result.conclusion,'FAILED_WITHOUT_STEP_DETAILS');
 assert.equal(result.failedStep,null);
});
test('failing quality step without logs does not claim source bug',()=>{
 const result=classifyCircleJob(job('Application unit tests'));
 assert.equal(result.conclusion,'QUALITY_STEP_FAILED_CAUSE_UNKNOWN');
 assert.equal(result.confidence,'STEP_NAME_ONLY');
});
test('assertions and TypeScript diagnostics establish source failures',()=>{
 assert.equal(classifyCircleJob(job('Application unit tests'),'AssertionError: expected true').conclusion,'SOURCE_OR_TEST_FAILURE');
 assert.equal(classifyCircleJob(job('TypeScript'),'src/a.ts(10): error TS2345: wrong type').conclusion,'SOURCE_OR_TEST_FAILURE');
});
test('executor and DNS issues are infrastructure, not application code',()=>{
 assert.equal(classifyCircleJob(job('Spin up environment')).conclusion,'INFRASTRUCTURE_OR_NETWORK');
 assert.equal(classifyCircleJob(job('Install dependencies'),'getaddrinfo ENOTFOUND registry.npmjs.org').conclusion,'INFRASTRUCTURE_OR_NETWORK');
});
test('npm dependency failures and exit 137 are separately classified',()=>{
 assert.equal(classifyCircleJob(job('Deterministic dependency install'),'npm ERR! code ELOCKVERIFY').conclusion,'DEPENDENCY_OR_LOCKFILE');
 assert.equal(classifyCircleJob(job('Next.js build',137)).conclusion,'RESOURCE_EXHAUSTION');
});
test('branch guards are CI configuration failures, not test PASS',()=>{
 assert.equal(classifyCircleJob(job('Verify exact branch, source SHA and non-privileged environment')).conclusion,'CI_CONFIGURATION_OR_POLICY');
});
test('no raw output or presigned URLs may leak into JSON classification',()=>{
 const secret='CIRCLECI_TOKEN=SUPER-SECRET-VALUE';
 const result=classifyCircleJob(job('Application unit tests'),secret+' AssertionError');
 assert.doesNotMatch(JSON.stringify(result),/SUPER-SECRET-VALUE|output_url|example\.invalid/);
 assert.equal(result.conclusion,'SOURCE_OR_TEST_FAILURE');
});
test('no failure step means no source failure assertion',()=>{
 const result=classifyCircleJob(job('Tests',0,'success'));
 assert.equal(result.conclusion,'NO_FAILED_STEP_OBSERVED');
});

test('live mode fails closed without a CircleCI token and makes no network request', async()=>{
 const {spawnSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const script=fileURLToPath(new URL('../../scripts/ci/circleci-readonly-diagnose.mjs',import.meta.url));
 const res=spawnSync(process.execPath,[script,'--job','416'],{
  encoding:'utf8',env:{...process.env,CIRCLECI_TOKEN:''},timeout:2000,
 });
 assert.equal(res.status,2);
 assert.match(res.stderr,/missing_CIRCLECI_TOKEN_readonly/);
 assert.equal(res.stdout,'');
});

test('CLI accepts an offline fixture without contacting CircleCI or exposing presigned URLs', async()=>{
 const {spawnSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const fs=await import('node:fs');
 const os=await import('node:os');
 const path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'risck-circleci-fixture-'));
 try{
  const fixture=path.join(dir,'job.json');
  fs.writeFileSync(fixture,JSON.stringify(job('Application unit tests')));
  const script=fileURLToPath(new URL('../../scripts/ci/circleci-readonly-diagnose.mjs',import.meta.url));
  const res=spawnSync(process.execPath,[script,'--input',fixture],{
   encoding:'utf8',env:{...process.env,CIRCLECI_TOKEN:''},timeout:2000,
  });
  assert.equal(res.status,0);
  const report=JSON.parse(res.stdout);
  assert.equal(report.conclusion,'QUALITY_STEP_FAILED_CAUSE_UNKNOWN');
  assert.equal(report.pipelineTriggered,false);
  assert.doesNotMatch(res.stdout,/example\.invalid|SECRET/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
