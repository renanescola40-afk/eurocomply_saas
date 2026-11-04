import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDat01Crosswalk } from './g5-02-crosswalk-integrity.mjs';

const versions = ['20261001000000','20261001000001','20261001000002'];
function fixture() {
  const first = 'supabase/migrations/20261001000000_a.sql';
  const consolidated = 'supabase/migrations/20261003000000_b.sql';
  return {
    expected: 3,
    ledger: { versions: [...versions] },
    crosswalk: {
      summary: { production_migration_identities: 3, mapped: 3, unresolved: 0, unique_source_files: 2, consolidated_source_groups: 1 },
      entries: [
        { order:1, production_version:versions[0], production_name:'a', source:first, mapping:'exact_version' },
        { order:2, production_version:versions[1], production_name:'b', source:consolidated, mapping:'canonical_name_match' },
        { order:3, production_version:versions[2], production_name:'c', source:consolidated, mapping:'superseded_by_forward_reconciliation' },
      ],
      consolidated_sources: [{ source:consolidated, production_versions:[versions[1],versions[2]] }],
    },
    provider: { ledger_versions:3, distinct_versions:3,
      rows:versions.map((version,i)=>({version,name:['a','b','c'][i],statement_count:1,joined_bytes:10,joined_statement_sha256:'a'.repeat(64)})) },
    exists: () => true,
  };
}
const check=(x)=>validateDat01Crosswalk(x);
test('complete metadata permits planning only, never replay or acceptance',()=> {
  const x=check(fixture()); assert.equal(x.status,'CONSISTENT_METADATA_ONLY');
  assert.deepEqual(x.issues,[]); assert.equal(x.qualifiedReview,'NOT_GRANTED');
  assert.equal(x.sqlByteEquivalence,'NOT_VERIFIED'); assert.equal(x.migrationReplay,'NOT_EXECUTED');
});
test('unsourced ledger entry fails closed',()=> {
  const x=fixture();x.crosswalk.entries[1].source='../../outside.sql';
  assert.ok(check(x).issues.some(e=>e.code==='UNSAFE_OR_NONCANONICAL_SOURCE'));
});
test('provider hash tampering fails closed',()=> {
  const x=fixture();x.provider.rows[0].joined_statement_sha256='broken';
  assert.ok(check(x).issues.some(e=>e.code==='INVALID_PROVIDER_HASH_METADATA'));
});
test('reordered names or versions fail closed',()=> {
  const x=fixture();x.crosswalk.entries[1].production_name='wrong';
  assert.ok(check(x).issues.some(e=>e.code==='PROVIDER_VERSION_OR_NAME'));
});
test('undeclared consolidation is rejected',()=> {
  const x=fixture();x.crosswalk.consolidated_sources=[];
  assert.ok(check(x).issues.some(e=>e.code==='CONSOLIDATION_GROUP_MISMATCH'));
});
test('missing migration SQL source is rejected',()=> {
  const x=fixture();x.exists=p=>!p.endsWith('_a.sql');
  assert.ok(check(x).issues.some(e=>e.code==='SOURCE_FILE_MISSING'));
});
test('exact mapping cannot point to a different timestamp',()=> {
  const x=fixture();x.crosswalk.entries[0].source='supabase/migrations/20261002000000_a.sql';
  assert.ok(check(x).issues.some(e=>e.code==='FALSE_EXACT_VERSION_MAPPING'));
});
