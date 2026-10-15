#!/usr/bin/env node
// Offline/read-only buyer room auditor. No network, credentials, email or writes.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,relative,posix,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOM='DATAGUARD_DATA_ROOM/';
const SUPPORT=['docs/due-diligence/','docs/ma-diligence/','docs/ma/buyer-materials/','docs/security/dataguard/'];
const SECRET=[
 ['github_token',/\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{24,}\b/g],
 ['github_pat',/\bgithub_pat_[A-Za-z0-9_]{32,}\b/g],
 ['payment_live',/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g],
 ['supabase_secret',/\bsb_secret_[A-Za-z0-9_-]{16,}\b/g],
 ['private_key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]
];
const EMAIL=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BINARY=/\.(?:png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|otf|zip|gz|mp4|mov|mp3|wav|lockb|map)$/i;
const digest=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>value.replace(/\\/g,'/');
function walk(dir,root,files) {
 for(const e of readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules','.next'].includes(e.name))continue;
  const f=join(dir,e.name),p=norm(relative(root,f));
  if(e.isDirectory())walk(f,root,files);
  else if(e.isFile()||e.isSymbolicLink())files.push(p);
 }
}
function sourceFiles(root){
 try {
  const raw=execFileSync('git',['ls-files','--cached','-z'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,timeout:20000});
  return [...new Set(raw.split('\0').filter(Boolean).map(norm))].sort();
 }catch{const p=[];walk(root,root,p);return p.sort();}
}
function markdownLinks(content){
 const result=[];let fence=null;
 for(const line of content.split(/\r?\n/)){
  const m=line.match(/^\s{0,3}(\x60{3,}|~{3,})/);
  if(m){if(!fence)fence={c:m[1][0],n:m[1].length};else if(m[1][0]===fence.c&&m[1].length>=fence.n)fence=null;continue;}
  if(fence)continue;
  const text=line.replace(/\x60[^\x60]*\x60/g,'');
  for(const link of text.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g)){
   const url=link[1]||link[2];if(url)result.push(url);
  }
 }
 return result;
}
function targetPath(root,source,url){
 if(/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(url))return null;
 const raw=url.split('#')[0].split('?')[0];if(!raw)return null;
 let decoded;try{decoded=decodeURIComponent(raw);}catch{return {reason:'invalid_encoding'};}
 if(decoded.includes('\0')||decoded.includes('\\')||isAbsolute(decoded))return {reason:'unsafe_path'};
 const p=posix.normalize(posix.join(posix.dirname(source),decoded));
 if(p==='..'||p.startsWith('../'))return {reason:'path_escape'};
 const full=resolve(root,p),base=resolve(root);
 if(full!==base&&!full.startsWith(base+'/'))return {reason:'path_escape'};
 return {path:p};
}
export function auditDataRoom(root,{support=true}={}){
 const paths=sourceFiles(root),pathSet=new Set(paths);
 const room=paths.filter(p=>p.startsWith(ROOM)),adjacent=support?paths.filter(p=>SUPPORT.some(s=>p.startsWith(s))):[];
 const subject=new Set([...room,...adjacent]);
 const manifest=[],missingRoom=[],missingSupport=[],missingCodeReferences=[],suspectedSecrets=[],suspectedSupportingSecrets=[],exclusions=[];
 let screened=0,roomMd=0,supportMd=0,links=0,emails=0,supportEmails=0,codeReferencesChecked=0;
 for(const p of paths){
  const full=join(root,p);
  if(!existsSync(full)){if(subject.has(p))exclusions.push({path:p,reason:'missing_file'});continue;}
  const st=lstatSync(full);
  if(st.isSymbolicLink()){if(subject.has(p))exclusions.push({path:p,reason:'symlink'});continue;}
  if(!st.isFile())continue;
  const data=readFileSync(full);
  manifest.push(p+'\t'+digest(data));
  if(!subject.has(p))continue;
  if(data.length>4*1024*1024||BINARY.test(p)||data.includes(0)){
   exclusions.push({path:p,reason:'binary_or_oversize'});continue;
  }
  const text=data.toString('utf8'),isRoom=p.startsWith(ROOM);
  screened++;
  for(const [kind,regexp] of SECRET){
   const count=[...text.matchAll(new RegExp(regexp.source,regexp.flags))].length;
   if(count)(isRoom?suspectedSecrets:suspectedSupportingSecrets).push({path:p,kind,count});
  }
  const emailMatches=[...text.matchAll(EMAIL)].length;
  if(isRoom)emails+=emailMatches;else supportEmails+=emailMatches;
  if(!p.endsWith('.md'))continue;
  // Check exact file paths inside inline backticks; a branch name without an
  // extension is not a file reference. Do not confuse a historical ref for
  // an existing path or claim this is a complete plain-text reference parser.
  for(const q of text.matchAll(/\x60((?:DATAGUARD_DATA_ROOM|docs|scripts|config|evidence)\/[A-Za-z0-9_./-]+\.(?:md|json|yml|yaml|mjs|ts|tsx|sql|csv))\x60/g)){
   const target=q[1];codeReferencesChecked++;
   if(!pathSet.has(target))missingCodeReferences.push({source:p,target});
  }
  if(isRoom)roomMd++;else supportMd++;
  for(const url of markdownLinks(text)){
   const result=targetPath(root,p,url);if(!result)continue;
   links++;
   if(result.reason||!pathSet.has(result.path)){
    const issue={source:p,reason:result.reason||'untracked_target',target:result.path||'(invalid)'};
    if(isRoom)missingRoom.push(issue);else missingSupport.push(issue);
   }
  }
 }
 let gitHead='fixture';
 try{gitHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
 const roomReferenceFailures=missingCodeReferences.filter(x=>x.source.startsWith(ROOM));
 const outcome=missingRoom.length||missingSupport.length||roomReferenceFailures.length||suspectedSecrets.length||roomMd!==room.filter(p=>p.endsWith('.md')).length
  ?'FAIL':emails||supportEmails||suspectedSupportingSecrets.length||exclusions.length
   ?'REQUIRES_HUMAN_REVIEW':'PASS_SCOPED_AUTOMATED_CHECKS';
 return {
  schema:'buyer-room-offline-v1',gitHead,trackedFiles:paths.length,
  sourceInventorySha256:digest(manifest.sort().join('\n')),
  dataRoomTrackedFiles:room.length,dataRoomMarkdown:roomMd,
  dataRoomMarkdownExpected:room.filter(p=>p.endsWith('.md')).length,
  supportingMarkdown:supportMd,filesContentScreened:screened,localLinksChecked:links,
  brokenRoomLinks:missingRoom,brokenSupportingLinks:missingSupport,
  codeReferencesChecked,missingCodeReferences,
  suspectedSecrets,suspectedSupportingSecrets,
  potentialEmailCountInDataRoom:emails,
  potentialEmailCountInSupportingDocuments:supportEmails,
  dataRoomUnscanned:exclusions.filter(x=>x.path.startsWith(ROOM)),
  supportingFilesUnscanned:exclusions.filter(x=>!x.path.startsWith(ROOM)),
  outcome,
  limits:'Static scoped source pre-screen. Regex negative results cannot prove absence of secrets or personal data. Human privacy/privilege review, legal title, production parity, independent assurance and buyer approval are not included.'
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=auditDataRoom(resolve(process.argv[2]||process.cwd()));
 process.stdout.write(JSON.stringify(output,null,2)+'\n');
 if(output.outcome==='FAIL')process.exitCode=1;
}
