import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const replay=readFileSync('scripts/diagnostics/g5-02-canonical-replay.py','utf8');
const preflight=readFileSync('scripts/diagnostics/dat01-provider-provenance-preflight.py','utf8');

test('provider provenance is checked before PostgreSQL readiness or migration execution',()=>{
  const guard=replay.indexOf('dat01-provider-provenance-preflight.py');
  const pgReady=replay.indexOf('subprocess.run(["pg_isready"');
  const psql=replay.indexOf('subprocess.run(["psql"');
  assert.ok(guard>=0 && pgReady>guard && psql>pgReady);
  assert.match(replay,/if preflight\.returncode!=0:/);
  assert.match(replay,/DAT01_PROVIDER_PROVENANCE_BLOCKED/);
});

test('provider preflight is read-only, exact identity-bound and never grants formal acceptance',()=>{
  assert.match(preflight,/tganhbbhfxcpblmgqprg/);
  assert.match(preflight,/len\(versions\)!=137/);
  assert.match(preflight,/e\.get\("order"\)/);
  assert.match(preflight,/"migration_execution_authorized":False/);
  assert.match(preflight,/"formal_gate_accepted":False/);
  assert.doesNotMatch(preflight,/subprocess|psycopg|supabase\.create_client|requests\.post/);
});
