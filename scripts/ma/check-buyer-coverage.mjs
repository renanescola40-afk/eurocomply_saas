#!/usr/bin/env node
/**
 * Fail-closed, read-only integrity check for the buyer-room Markdown baseline
 * and the 12-claim initial buyer brief crosswalk. Does not send or upload data.
 * Snapshot hashes are pinned to the pre-edit baseline, not current HEAD hashes.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOM='DATAGUARD_DATA_ROOM/';
const SOURCE_DIRS=[ROOM,'docs/due-diligence/','docs/ma-diligence/','docs/ma/buyer-materials/','docs/security/dataguard/'];
const PROVENANCE=ROOM+'15_EVIDENCE_MANIFEST/PROVENANCE_REGISTER_V2_2026-10-15.md';
const BRIEF=ROOM+'00_EXECUTIVE_INDEX/STAGE_A_CONTROLLED_BUYER_BRIEF_EN_2026-10-15.md';
const segment=(s,begin,end)=>{const n=s.indexOf(begin);if(n<0)return '';const after=s.slice(n+begin.length);const j=after.indexOf(end);return j<0?after:after.slice(0,j)};
const stableUnique=xs=>[...new Set(xs)].sort();
const includesPath=path=>SOURCE_DIRS.some(dir=>path.startsWith(dir))&&path.endsWith('.md');
export function evaluateBuyerCoverage(provenance,brief,trackedPaths,{expected=80}={}){
 const inventory=segment(provenance,'## V6 exhaustive source-identity baseline','### 16 section-level claim/accountability classifications');
 const rows=[...inventory.matchAll(/^\|\s*(\d+)\s*\|\s*\x60([^\x60]+)\x60\s*\|\s*\x60([0-9a-f]{40})\x60\s*\|\s*TRACKED_IN_UNTRUNCATED_TREE\s*\|/gm)]
   .map(m=>({index:Number(m[1]),path:m[2],baselineBlob:m[3]}));
 const expectedPaths=rows.map(x=>x.path);
 const expectedSet=new Set(expectedPaths),currentPaths=trackedPaths.filter(includesPath);
 const missing=stableUnique(expectedPaths.filter(x=>!trackedPaths.includes(x)));
 const extra=stableUnique(currentPaths.filter(x=>!expectedSet.has(x)));
 const duplicated=stableUnique(expectedPaths.filter((x,i)=>expectedPaths.indexOf(x)!==i));
 const invalidOrdinal=rows.filter((x,i)=>x.index!==i+1).length;
 const classPart=segment(provenance,'### 16 section-level claim/accountability classifications','### Exhaustiveness definition and non-claims');
 const classes=[...classPart.matchAll(/^\|\s*\x60(0[0-9]|1[0-5])_[A-Z_]+\x60\s*\|/gm)].map(m=>m[1]);
 const expectedClasses=Array.from({length:16},(_,i)=>String(i).padStart(2,'0'));
 const missingClasses=expectedClasses.filter(x=>!classes.includes(x));
 const claimPart=segment(provenance,'## V5 controlled Stage A claim-to-source traceability','## V6 exhaustive source-identity baseline');
 const claims=[...claimPart.matchAll(/^\|\s*(0[1-9]|1[0-2])\.\s/gm)].map(m=>m[1]);
 const expectedClaims=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
 const missingClaims=expectedClaims.filter(x=>!claims.includes(x));
 const sourceReferences=stableUnique([...brief.matchAll(/\x60((?:docs|DATAGUARD_DATA_ROOM)\/[A-Za-z0-9_./-]+\.(?:md|json|yml|yaml))\x60/g)].map(x=>x[1]));
 const missingBriefReferences=sourceReferences.filter(x=>!trackedPaths.includes(x));
 const passed=rows.length===expected&&expectedPaths.length===expectedSet.size&&currentPaths.length===expected&&
  !missing.length&&!extra.length&&!duplicated.length&&!invalidOrdinal&&classes.length===16&&
  !missingClasses.length&&claims.length===12&&!missingClaims.length&&
  sourceReferences.length>=6&&!missingBriefReferences.length;
 return {
  status:passed?'PASS_SCOPED_BASELINE_AND_INITIAL_CLAIMS':'FAIL',
  scope:'Five repository data-room/support Markdown directories; exact frozen Git file identity, 16 source categories, 12 initial-brief claim categories. Not a runtime, external, privacy or legal audit.',
  expectedDocumentCount:expected,baselineRows:rows.length,currentScopeMarkdownCount:currentPaths.length,
  missingTrackedBaselinePaths:missing,unindexedCurrentPaths:extra,duplicateBaselinePaths:duplicated,invalidOrdinalCount:invalidOrdinal,
  sectionClassesPresent:classes.length,missingSectionClasses:missingClasses,
  initialBuyerClaimsPresent:claims.length,missingInitialClaims:missingClaims,
  stageASourcePathCount:sourceReferences.length,missingStageASources:missingBriefReferences,
  buyerRelease:'HOLD',
  disclaimer:'An inventory of known source identities and claim provenance cannot authenticate external facts, eliminate historical sensitive exposure, approve legal title or grant buyer access.'
 };
}
export function verifyBuyerCoverage(root){
 const paths=execFileSync('git',['ls-files','--cached','-z'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,timeout:20000}).split('\0').filter(Boolean);
 if(!existsSync(resolve(root,PROVENANCE))||!existsSync(resolve(root,BRIEF)))
  return {status:'FAIL',reason:'required_baseline_or_brief_missing'};
 return evaluateBuyerCoverage(readFileSync(resolve(root,PROVENANCE),'utf8'),readFileSync(resolve(root,BRIEF),'utf8'),paths);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let result;
 try{result=verifyBuyerCoverage(resolve(process.argv[2]||process.cwd()));}
 catch(error){result={status:'FAIL',reason:'unable_to_reconcile_checkout',kind:error.code||error.name};}
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(result.status!=='PASS_SCOPED_BASELINE_AND_INITIAL_CLAIMS')process.exitCode=1;
}
