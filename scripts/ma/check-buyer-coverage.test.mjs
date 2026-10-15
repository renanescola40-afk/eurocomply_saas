import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {evaluateBuyerCoverage} from './check-buyer-coverage.mjs';
const m=String.fromCharCode(96);
function sample(){
 let p='## V5 controlled Stage A claim-to-source traceability\n';
 p+=Array.from({length:12},(_,i)=>'| '+String(i+1).padStart(2,'0')+'. example |').join('\n');
 p+='\n## V6 exhaustive source-identity baseline\n';
 p+='| 1 | '+m+'DATAGUARD_DATA_ROOM/index.md'+m+' | '+m+'a'.repeat(40)+m+' | TRACKED_IN_UNTRUNCATED_TREE |\n';
 p+='| 2 | '+m+'docs/ma-diligence/proof.md'+m+' | '+m+'b'.repeat(40)+m+' | TRACKED_IN_UNTRUNCATED_TREE |\n';
 p+='### 16 section-level claim/accountability classifications\n';
 p+=Array.from({length:16},(_,i)=>'| '+m+String(i).padStart(2,'0')+'_SECTION'+m+' | Details |').join('\n');
 p+='\n### Exhaustiveness definition and non-claims\n';
 return {p,brief:'Sources '+m+'docs/ma-diligence/proof.md'+m+' '+m+'DATAGUARD_DATA_ROOM/index.md'+m,
 paths:['DATAGUARD_DATA_ROOM/index.md','docs/ma-diligence/proof.md']};
}
test('rejects incomplete source coverage rather than extrapolating PASS',()=>{
 const x=sample();const out=evaluateBuyerCoverage(x.p,x.brief,x.paths,{expected:2});
 assert.equal(out.status,'FAIL');
 assert.equal(out.stageASourcePathCount,2);
});
test('detects missing or additional tracked source files',()=>{
 const x=sample();const out=evaluateBuyerCoverage(x.p,x.brief,[...x.paths,'docs/ma-diligence/extra.md'],{expected:2});
 assert.equal(out.status,'FAIL');assert.equal(out.unindexedCurrentPaths.length,1);
});
test('detects untracked Stage A provenance',()=>{
 const x=sample(),brief=x.brief+' '+m+'docs/ma-diligence/missing.md'+m;
 const out=evaluateBuyerCoverage(x.p,brief,x.paths,{expected:2});
 assert.equal(out.status,'FAIL');assert.equal(out.missingStageASources.length,1);
});
test('counts all 16 evidence classes and 12 claim rows',()=>{
 const x=sample(),out=evaluateBuyerCoverage(x.p,x.brief,x.paths,{expected:2});
 assert.equal(out.sectionClassesPresent,16);assert.equal(out.initialBuyerClaimsPresent,12);
 assert.equal(out.missingSectionClasses.length,0);assert.equal(out.missingInitialClaims.length,0);
});
test('rejects duplicate frozen source identity',()=>{
 const x=sample();
 const extra='| 3 | '+m+'DATAGUARD_DATA_ROOM/index.md'+m+' | '+m+'c'.repeat(40)+m+' | TRACKED_IN_UNTRUNCATED_TREE |\n';
 const corrupted=x.p.replace('### 16 section-level claim/accountability classifications',extra+'### 16 section-level claim/accountability classifications');
 const out=evaluateBuyerCoverage(corrupted,x.brief,x.paths,{expected:2});
 assert.equal(out.status,'FAIL');assert.equal(out.duplicateBaselinePaths.length,1);
});
