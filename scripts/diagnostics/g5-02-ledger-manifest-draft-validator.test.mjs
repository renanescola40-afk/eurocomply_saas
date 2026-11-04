import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraftManifest, verifyFrozenGitBlob } from './g5-02-ledger-manifest-draft-validator.mjs';
import { createHash } from 'node:crypto';
const status = ['CURRENT_CANONICAL_SOURCE_BYTES_VERIFIED', 'IMMUTABLE_HISTORICAL_GIT_SOURCE_BYTES_VERIFIED', 'NO_PROVEN_WHOLE_SOURCE_BYTES', 'CURRENT_MAPPED_SOURCE_BYTES_VERIFIED_IDENTITY_PENDING', 'ALTERNATIVE_SOURCE_FILE_BYTES_VERIFIED_IDENTITY_PENDING'];
function fixture() {
  const entries=[], rows=[], records=[];
  const source = i => `supabase/migrations/${String(20260605000000 + i)}_fixture.sql`;
  const versions = Array.from({length:137},(_,i)=>String(20260605000000+i));
  const consolidations=[{source:source(112),production_versions:[versions[112],versions[113]]},{source:source(135),production_versions:[versions[135],versions[136]]}];
  for(let i=0;i<137;i++){
    const exact=i<112;
    const s=exact?(i<87?status[0]:i<89?status[1]:status[2]):i<125?status[3]:i===125?status[4]:status[2];
    const consolidated=consolidations.find(g=>g.production_versions.includes(versions[i]));
    const mapping=exact?'exact_version':i>=135?'superseded_by_forward_reconciliation':'canonical_name_match';
    const entry={order:i+1,production_version:versions[i],production_name:'fixture_'+i,source:consolidated?.source??source(i),mapping};entries.push(entry);
    const prov={version:versions[i],name:entry.production_name,statement_count:1,joined_bytes:8,joined_statement_sha256:'a'.repeat(64)};rows.push(prov);
    const replacement=s===status[1]||s===status[4]?{path:source(i),gitBlobSha:'b'.repeat(40),representation:'RAW'}:null;
    const groupIndex=consolidations.indexOf(consolidated);
    records.push({order:i+1,version:versions[i],name:entry.production_name,mappingType:mapping,canonicalSourcePath:entry.source,canonicalSourceGitBlobSha:null,providerStatementCount:1,providerJoinedUtf8Bytes:8,providerJoinedSha256:prov.joined_statement_sha256,sourceByteProof:{status:s,evidence:'fixture',replacementSource:replacement,origin:'fixture'},consolidation:consolidated?{groupId:`CONSOLIDATION_${groupIndex+1}`,canonicalSource:consolidated.source,otherVersions:consolidated.production_versions}:null,identityQualified:exact?'EXACT_VERSION_METADATA_ONLY':'NONEXACT_MAPPING_REVIEW_REQUIRED',sourceByteEqualityConfirmed:s!==status[2],approvedForExecutableReplay:false,independentReviewer:'PENDING'});
  }
  return { manifest:{schema:'risck-comply.dat01.ledger-bound-source-provenance-draft.v1',state:'DRAFT_NOT_EXECUTABLE_NOT_APPROVED',invariants:{ledgerRows:137,uniqueVersions:137,nonexactIdentitiesPendingReview:25,sourceByteProvenanceEntries:103,sourceByteUnresolvedEntries:34,independentReviewsApproved:0,postgres17Replayed:0,formalGateA12:'BLOCKED'},records},crosswalk:{entries,consolidated_sources:consolidations},ledger:{rows}};
}
const run = f => validateDraftManifest(f.manifest,f.crosswalk,f.ledger);
test('137 ledger rows can be internally consistent but never formally accepted',()=>{let result=run(fixture());assert.equal(result.total,137);assert.equal(result.status,'DRAFT_SCHEMA_CONSISTENT_NOT_ACCEPTED');assert.equal(result.acceptance,'NOT_GRANTED');assert.equal(result.executableRows,0);});
test('one forged provider SHA is rejected',()=>{let f=fixture();f.manifest.records[31].providerJoinedSha256='f'.repeat(64);assert.throws(()=>run(f),/DAT01_MANIFEST_PROVIDER_HASH_32/);});
test('source path substitution cannot change crosswalk identity',()=>{let f=fixture();f.manifest.records[2].canonicalSourcePath='supabase/migrations/fake.sql';assert.throws(()=>run(f),/DAT01_MANIFEST_SOURCE_MAPPING_3/);});
test('duplicated migration version is rejected',()=>{let f=fixture();f.manifest.records[4].version=f.manifest.records[3].version;assert.throws(()=>run(f),/DAT01_MANIFEST_VERSION_5/);});
test('out-of-order ledger entry is rejected',()=>{let f=fixture();f.manifest.records[10].order=12;assert.throws(()=>run(f),/DAT01_MANIFEST_ORDER_11/);});
test('any premature executable flag fails closed',()=>{let f=fixture();f.manifest.records[45].approvedForExecutableReplay=true;assert.throws(()=>run(f),/DAT01_MANIFEST_PREMATURE_APPROVAL_46/);});
test('fake independent reviewer approval fails closed',()=>{let f=fixture();f.manifest.records[45].independentReviewer='APPROVED';assert.throws(()=>run(f),/DAT01_MANIFEST_PREMATURE_APPROVAL_46/);});
test('nonexact mapping cannot be marked as exact identity',()=>{let f=fixture();f.manifest.records[115].identityQualified='EXACT_VERSION_METADATA_ONLY';assert.throws(()=>run(f),/DAT01_MANIFEST_NONEXACT_REVIEW_116/);});
test('fabricated source-byte proof raises count error',()=>{let f=fixture();f.manifest.records[90].sourceByteProof.status=status[0];assert.throws(()=>run(f),/DAT01_MANIFEST_BYTE_PROOF_FLAG_91/);});
test('untrusted alternative source blob is rejected',()=>{let f=fixture();f.manifest.records[87].sourceByteProof.replacementSource.gitBlobSha='invalid';assert.throws(()=>run(f),/DAT01_MANIFEST_ALTERNATIVE_SOURCE_88/);});
test('consolidation groups cannot be silently disjoined',()=>{let f=fixture();f.manifest.records[112].consolidation=null;assert.throws(()=>run(f),/DAT01_MANIFEST_CONSOLIDATION_113/);});
test('missing provider ledger record fails',()=>{let f=fixture();f.ledger.rows.pop();assert.throws(()=>run(f),/DAT01_MANIFEST_PROVIDER_COUNT/);});
test('declared reviewed/replayed values cannot be forged',()=>{let f=fixture();f.manifest.invariants.postgres17Replayed=137;assert.throws(()=>run(f),/DAT01_MANIFEST_DECLARED_INVARIANTS/);});
test('fabricated proof with forged truth flag still changes immutable aggregate count',()=>{let f=fixture();f.manifest.records[90].sourceByteProof.status=status[0];f.manifest.records[90].sourceByteEqualityConfirmed=true;assert.throws(()=>run(f),/DAT01_MANIFEST_AGGREGATE_COUNTS/);});

test('Git object pinning accepts only the exact byte-for-byte approved blob', () => {
  const original = Buffer.from('{"count":137}\n');
  const pin = createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
  assert.equal(verifyFrozenGitBlob(original, pin, 'MANIFEST'), pin);
  assert.throws(() => verifyFrozenGitBlob(Buffer.from('{"count":137}'), pin, 'MANIFEST'), /DAT01_MANIFEST_PIN_MISMATCH_MANIFEST/);
});
test('tampering with a frozen provider snapshot is rejected even when other JSON could be edited', () => {
  const original = Buffer.from('{"rows":[1,2]}');
  const pin = createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
  const tampered = Buffer.from('{"rows":[1,3]}');
  assert.throws(() => verifyFrozenGitBlob(tampered, pin, 'PROVIDER_LEDGER'), /DAT01_MANIFEST_PIN_MISMATCH_PROVIDER_LEDGER/);
});
test('frozen crosswalk bytes reject equivalent JSON with re-ordered whitespace', () => {
  const original = Buffer.from('{"entries":[]}\n');
  const pin = createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
  assert.throws(() => verifyFrozenGitBlob(Buffer.from('{ "entries": [] }\n'), pin, 'CROSSWALK'), /DAT01_MANIFEST_PIN_MISMATCH_CROSSWALK/);
});
test('invalid frozen Git object ID or arbitrary review role fails closed', () => {
  const input = Buffer.from('x');
  assert.throws(() => verifyFrozenGitBlob(input, 'not-git-hash', 'MANIFEST'), /DAT01_MANIFEST_PIN_FORMAT/);
  assert.throws(() => verifyFrozenGitBlob(input, 'a'.repeat(40), 'ROLE;SQL'), /DAT01_MANIFEST_PIN_ROLE/);
});
