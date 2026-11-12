#!/usr/bin/env node
// QAT-01 authenticated source-CI verifier. Never grants formal acceptance or release.
import {fileURLToPath} from 'node:url';
export const REPOSITORY='renanescola40-afk/eurocomply_saas';
export const REQUIRED_CHECKS=Object.freeze([
  'Core CI, build and npm audit','Run security gates, typecheck and tests',
  'CI / quality','CodeQL','Semgrep SAST','Secret scanning (Gitleaks)',
  'Actionlint','OSSF Scorecard','Dependency Review','Quality, security, build',
  'E2E production-like gate'
]);
export const CIRCLECI_CONTEXT='ci/circleci: pr-source-autopilot';
const SHA=/^[a-f0-9]{40}$/;
function trustedRun(r,sha){
  return r&&r.head_sha===sha&&r.app?.slug==='github-actions'&&r.app?.name==='GitHub Actions'&&
    r.status==='completed'&&r.conclusion==='success'&&
    Number.isFinite(Date.parse(r.started_at||''))&&Number.isFinite(Date.parse(r.completed_at||''))&&
    /^https:\/\/github\.com\/renanescola40-afk\/eurocomply_saas\/actions\/runs\/\d+\/job\/\d+$/.test(r.html_url||'');
}
export async function verifyQat01NativeChecks({sha,token,request=fetch}={}){
  const base={tested_source_sha:sha??null,formal_gate_acceptance:'NOT_ACCEPTED',production_release_authorized:false};
  const reject=(errors,checks=[],circleci=null)=>({...base,decision:'NOT_VERIFIED',errors,checks,circleci});
  if(!SHA.test(String(sha||'')))return reject(['exact_source_sha_required']);
  if(typeof token!=='string'||token.length<8||typeof request!=='function')return reject(['authenticated_github_read_required']);
  const api='https://api.github.com/repos/'+REPOSITORY;
  const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
  const read=async resource=>{
    const response=await request(api+resource,{headers,redirect:'error',signal:AbortSignal.timeout(12000)});
    if(!response?.ok)throw Error('provider_readback_unavailable');
    return response.json();
  };
  try{
    let runs=[],expected=null;
    for(let page=1;page<=10;page++){
      const r=await read('/commits/'+sha+'/check-runs?per_page=100&page='+page);
      if(!Number.isSafeInteger(r.total_count)||r.total_count<0||r.total_count>1000||
         !Array.isArray(r.check_runs)||r.check_runs.length>100)throw Error('invalid_check_page');
      if(expected===null)expected=r.total_count;
      if(expected!==r.total_count)throw Error('inconsistent_total_count');
      runs.push(...r.check_runs);
      if(runs.length>=expected)break;
      if(r.check_runs.length<100||page===10)throw Error('incomplete_pagination');
    }
    if(runs.length!==expected)throw Error('incomplete_result');
    const statuses=await read('/commits/'+sha+'/status');
    if(!Array.isArray(statuses.statuses))throw Error('invalid_status_shape');
    const errors=[],checks=[];
    for(const name of REQUIRED_CHECKS){
      const matches=runs.filter(x=>x.name===name&&x.head_sha===sha&&x.app?.slug==='github-actions');
      matches.sort((a,b)=>Date.parse(b.started_at||'')-Date.parse(a.started_at||'')||(b.id||0)-(a.id||0));
      const latest=matches[0];
      if(!latest)errors.push('missing_authenticated_check:'+name);
      else if(!trustedRun(latest,sha))errors.push('latest_required_check_not_success:'+name);
      else checks.push({name,job_url:latest.html_url,id:latest.id});
    }
    const circle=statuses.statuses.filter(x=>x.context===CIRCLECI_CONTEXT);
    circle.sort((a,b)=>Date.parse(b.updated_at||b.created_at||'')-Date.parse(a.updated_at||a.created_at||''));
    const latest=circle[0];
    if(!latest||latest.state!=='success'||!/^https:\/\/(?:app\.)?circleci\.com\//.test(latest.target_url||''))errors.push('authentic_circleci_success_missing');
    const circleci=latest?{context:latest.context,state:latest.state,link:latest.target_url}:null;
    return errors.length?reject(errors,checks,circleci):{...base,decision:'SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE',errors:[],checks,circleci};
  }catch{return reject(['provider_readback_incomplete']);}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const report=await verifyQat01NativeChecks({sha:process.argv[2]||process.env.GITHUB_SHA,token:process.env.GITHUB_TOKEN});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.decision==='NOT_VERIFIED')process.exitCode=1;
}
