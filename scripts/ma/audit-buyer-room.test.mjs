import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditDataRoom} from './audit-buyer-room.mjs';
function fixture(files,fn){
 const root=mkdtempSync(join(tmpdir(),'dataguard-audit-'));
 try{
  for(const [p,content] of Object.entries(files)){
   const file=join(root,p);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,content);
  }
  fn(root);
 }finally{rmSync(root,{recursive:true,force:true});}
}
test('resolves local links and ignores external URLs',()=>{
 fixture({'DATAGUARD_DATA_ROOM/index.md':'[Local](docs/ok.md)\n[Web](https://example.org)','DATAGUARD_DATA_ROOM/docs/ok.md':'# hi'},root=>{
  const r=auditDataRoom(root,{support:false});assert.equal(r.outcome,'PASS_SCOPED_AUTOMATED_CHECKS');assert.equal(r.localLinksChecked,1);
 });
});
test('a missing local link is a hard failure',()=>{
 fixture({'DATAGUARD_DATA_ROOM/index.md':'[Missing](bad.md)'},root=>{
  const r=auditDataRoom(root,{support:false});assert.equal(r.outcome,'FAIL');assert.equal(r.brokenRoomLinks.length,1);
 });
});
test('fenced and inline markdown examples are not link targets',()=>{
 const q=String.fromCharCode(96),example='Example '+q+'[Fake](nope.md)'+q+'\n~~~md\n[Fake](missing.md)\n~~~\n[Real](ok.md)';
 fixture({'DATAGUARD_DATA_ROOM/index.md':example,'DATAGUARD_DATA_ROOM/ok.md':'ok'},root=>{
  const r=auditDataRoom(root,{support:false});assert.equal(r.outcome,'PASS_SCOPED_AUTOMATED_CHECKS');assert.equal(r.localLinksChecked,1);
 });
});
test('strong synthetic token is detected without printing token contents',()=>{
 const token='ghp_'+'A'.repeat(40);
 fixture({'DATAGUARD_DATA_ROOM/index.md':'token='+token},root=>{
  const r=auditDataRoom(root,{support:false});assert.equal(r.outcome,'FAIL');assert.equal(r.suspectedSecrets[0].kind,'github_token');assert.equal(JSON.stringify(r).includes(token),false);
 });
});
test('email candidate is not mistaken for human privacy approval',()=>{
 fixture({'DATAGUARD_DATA_ROOM/index.md':'owner@example.org'},root=>{
  const r=auditDataRoom(root,{support:false});assert.equal(r.outcome,'REQUIRES_HUMAN_REVIEW');assert.equal(r.potentialEmailCountInDataRoom,1);
 });
});

test('missing link in supporting evidence is not silently advisory',()=>{
 fixture({
  'DATAGUARD_DATA_ROOM/index.md':'[Okay](present.md)',
  'DATAGUARD_DATA_ROOM/present.md':'ok',
  'docs/ma-diligence/register.md':'[Broken](does-not-exist.pdf)'
 },root=>{
  const r=auditDataRoom(root);
  assert.equal(r.outcome,'FAIL');
  assert.equal(r.brokenSupportingLinks.length,1);
  assert.equal(r.brokenRoomLinks.length,0);
 });
});
test('supporting document email requires manual screening without logging its value',()=>{
 const address='person'+'@'+'private-domain.example';
 fixture({
  'DATAGUARD_DATA_ROOM/index.md':'# safe',
  'docs/ma-diligence/register.md':'Buyer contact: '+address
 },root=>{
  const r=auditDataRoom(root);
  assert.equal(r.outcome,'REQUIRES_HUMAN_REVIEW');
  assert.equal(r.potentialEmailCountInSupportingDocuments,1);
  assert.equal(JSON.stringify(r).includes(address),false);
 });
});
test('references to non-existent tracked file paths inside backticks are detected',()=>{
 const tick=String.fromCharCode(96);
 fixture({
  'DATAGUARD_DATA_ROOM/index.md':'See '+tick+'docs/ma-diligence/absent.md'+tick
 },root=>{
  const r=auditDataRoom(root,{support:false});
  assert.equal(r.outcome,'FAIL');
  assert.equal(r.missingCodeReferences.length,1);
 });
});
test('supporting document suspected secrets are flagged for review, not copied',()=>{
 const fake='sk_live_'+'Z'.repeat(32);
 fixture({
  'DATAGUARD_DATA_ROOM/index.md':'# control',
  'docs/due-diligence/tokens.md':'synthetic fixture '+fake
 },root=>{
  const r=auditDataRoom(root);
  assert.equal(r.outcome,'REQUIRES_HUMAN_REVIEW');
  assert.equal(r.suspectedSupportingSecrets.length,1);
  assert.equal(JSON.stringify(r).includes(fake),false);
 });
});

test('known corporate role mailbox is classified but never authorizes buyer disclosure',()=>{
 const known='comercial'+'@'+'risckcomply.com';
 fixture({
  'DATAGUARD_DATA_ROOM/index.md':'# internal room',
  'docs/ma-diligence/contact.md':'Internal corporate contact: '+known
 },root=>{
  const result=auditDataRoom(root);
  assert.equal(result.outcome,'PASS_SCOPED_AUTOMATED_CHECKS');
  assert.equal(result.classifiedPublicCorporateRoleMailboxes,1);
  assert.equal(result.potentialEmailCountInSupportingDocuments,0);
  assert.equal(JSON.stringify(result).includes(known),false);
 });
});
