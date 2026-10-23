#!/usr/bin/env node
/**
 * RISCK COMPLY CircleCI MCP bridge (stdio, Node >=20, zero dependencies).
 * Read-only by default. No token is ever returned to the MCP caller.
 */
import { createInterface } from 'node:readline';

const API = 'https://circleci.com/api/v2';
const token = process.env.CIRCLECI_API_TOKEN || '';
const slug = process.env.CIRCLECI_PROJECT_SLUG || '';
const allowTrigger = process.env.CIRCLECI_ENABLE_TRIGGER === 'true';
const allowedBranches = new Set((process.env.CIRCLECI_TRIGGER_BRANCHES || '').split(',').map(x => x.trim()).filter(Boolean));
const definitions = [
  { name:'circleci_list_pipelines',description:'Read pipelines for the configured CircleCI project, optionally by branch.',inputSchema:{type:'object',properties:{branch:{type:'string'},page_token:{type:'string'}},additionalProperties:false}},
  { name:'circleci_pipeline_workflows',description:'Read workflow results for a pipeline UUID.',inputSchema:{type:'object',properties:{pipeline_id:{type:'string'}},required:['pipeline_id'],additionalProperties:false}},
  { name:'circleci_workflow_jobs',description:'Read job summaries for a workflow UUID.',inputSchema:{type:'object',properties:{workflow_id:{type:'string'}},required:['workflow_id'],additionalProperties:false}},
  { name:'circleci_job_details',description:'Read metadata for a job number (no raw step logs).',inputSchema:{type:'object',properties:{job_number:{type:'integer',minimum:1}},required:['job_number'],additionalProperties:false}},
  { name:'circleci_trigger_pipeline',description:'Opt-in pipeline trigger: disabled unless operator enables it and explicitly allowlists the branch; consumes CircleCI credits.',inputSchema:{type:'object',properties:{branch:{type:'string'},run_qa_preflight:{type:'boolean'},run_qa_full:{type:'boolean'},approval:{type:'string'}},required:['branch','approval'],additionalProperties:false}},
];
function verifyId(id) {if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))throw Error('invalid UUID');return id;}
function verifySlug(){if(!/^[a-z0-9_-]+\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(slug))throw Error('Configure the exact CIRCLECI_PROJECT_SLUG from CircleCI Project Settings');return slug.split('/').map(encodeURIComponent).join('/');}
async function request(path,{method='GET',body}={}){
  if(!token)throw Error('CIRCLECI_API_TOKEN missing; store locally as a protected environment variable');
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),12000);
  try{
    const r=await fetch(API+path,{method,headers:{'Circle-Token':token,'Accept':'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:abort.signal,redirect:'error'});
    const txt=await r.text();
    if(!r.ok)throw Error('CircleCI HTTP '+r.status+' (inspect provider independently)');
    if(txt.length>1_000_000)throw Error('response too large');
    return JSON.parse(txt);
  }finally{clearTimeout(timer);}
}
async function invoke(name,a={}){
  const project=()=>'/project/'+verifySlug();
  if(name==='circleci_list_pipelines'){
    const q=new URLSearchParams();
    if(a.branch){if(typeof a.branch!=='string'||a.branch.length>120)throw Error('invalid branch');q.set('branch',a.branch);}
    if(a.page_token)q.set('page-token',String(a.page_token));
    const out=await request(project()+'/pipeline'+(q.size?'?'+q.toString():''));
    return {items:(out.items||[]).map(x=>({id:x.id,number:x.number,state:x.state,created_at:x.created_at,vcs:x.vcs?{revision:x.vcs.revision,branch:x.vcs.branch}:undefined})),next_page_token:out.next_page_token};
  }
  if(name==='circleci_pipeline_workflows'){
    const o=await request('/pipeline/'+verifyId(a.pipeline_id)+'/workflow');
    return {items:(o.items||[]).map(x=>({id:x.id,name:x.name,status:x.status,created_at:x.created_at,stopped_at:x.stopped_at,pipeline_id:x.pipeline_id})),next_page_token:o.next_page_token};
  }
  if(name==='circleci_workflow_jobs'){
    const o=await request('/workflow/'+verifyId(a.workflow_id)+'/job');
    return {items:(o.items||[]).map(x=>({id:x.id,name:x.name,status:x.status,job_number:x.job_number,started_at:x.started_at,stopped_at:x.stopped_at})),next_page_token:o.next_page_token};
  }
  if(name==='circleci_job_details'){
    if(!Number.isSafeInteger(a.job_number)||a.job_number<1)throw Error('invalid job number');
    const o=await request(project()+'/job/'+a.job_number);
    return {id:o.id,name:o.name,number:o.number,status:o.status,started_at:o.started_at,stopped_at:o.stopped_at,web_url:o.web_url};
  }
  if(name==='circleci_trigger_pipeline'){
    if(!allowTrigger)throw Error('Triggering disabled: set CIRCLECI_ENABLE_TRIGGER=true explicitly.');
    if(typeof a.branch!=='string'||!allowedBranches.has(a.branch)||a.branch==='main')throw Error('Branch is not explicitly allowlisted for non-production execution');
    if(a.approval!=='OWNER_APPROVED_CIRCLECI_CREDITS')throw Error('Explicit owner approval acknowledgement required');
    if(a.run_qa_full===true && a.run_qa_preflight===true)throw Error('Choose one opt-in test mode');
    const parameters={};
    if(a.run_qa_full===true)parameters.run_qa_full=true;
    if(a.run_qa_preflight===true)parameters.run_qa_preflight=true;
    const result=await request(project()+'/pipeline',{method:'POST',body:{branch:a.branch,parameters}});
    return {id:result.id,number:result.number,state:result.state,message:'Pipeline submitted, NOT verified PASS; check exact SHA and workflows'};
  }
  throw Error('Unknown tool');
}
function send(message){process.stdout.write(JSON.stringify(message)+'\n');}
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',async line=>{
  let msg;
  try{
    if(line.length>65536)throw Error('request too large');
    msg=JSON.parse(line);
    if(!msg||msg.jsonrpc!=='2.0')throw Error('invalid JSON RPC');
    if(msg.method==='notifications/initialized')return;
    if(msg.method==='initialize')return send({jsonrpc:'2.0',id:msg.id,result:{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'risck-circleci-safe',version:'0.1.0'}}});
    if(msg.method==='ping')return send({jsonrpc:'2.0',id:msg.id,result:{}});
    if(msg.method==='tools/list')return send({jsonrpc:'2.0',id:msg.id,result:{tools:definitions}});
    if(msg.method==='tools/call'){
      const {name,arguments:a}=(msg.params||{});
      try{return send({jsonrpc:'2.0',id:msg.id,result:{content:[{type:'text',text:JSON.stringify(await invoke(name,a||{}))}]}});}
      catch(e){return send({jsonrpc:'2.0',id:msg.id,result:{isError:true,content:[{type:'text',text:String(e.message||'Unknown error')}]}});}
    }
    if(msg.id!==undefined)send({jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Method not found'}});
  }catch(e){if(msg?.id!==undefined)send({jsonrpc:'2.0',id:msg.id,error:{code:-32600,message:'Invalid request'}});}
});
