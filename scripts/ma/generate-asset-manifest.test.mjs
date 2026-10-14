import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const script = resolve('scripts/ma/generate-asset-manifest.mjs');
test('offline asset inventory refuses non-tmp output and does not hash secret paths or follow symlinks', () => {
  const repo = mkdtempSync(join(tmpdir(), 'risck-ma-fixture-'));
  execFileSync('git', ['init', '-q'], { cwd:repo });
  mkdirSync(join(repo,'src'),{recursive:true});
  writeFileSync(join(repo,'src','app.ts'),'export const answer = 42;\n');
  writeFileSync(join(repo,'.env.production'),'DO_NOT_EXPOSE=true\n');
  symlinkSync(join(repo,'.env.production'),join(repo,'src','env-link'));
  execFileSync('git',['add','.'],{cwd:repo});
  const out = '/var/tmp/risck-ma-rejected'; // must be rejected: outside /tmp allowlist
  const rejected=spawnSync(process.execPath,[script,out],{cwd:repo,encoding:'utf8'});
  assert.notEqual(rejected.status,0);
  const safe = mkdtempSync(join(tmpdir(),'risck-ma-output-'));
  const ok=spawnSync(process.execPath,[script,safe],{cwd:repo,encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);
  const data=JSON.parse(readFileSync(join(safe,'manifest.json'),'utf8'));
  assert.equal(data.assets.find(x=>x.path==='src/app.ts').category,'APPLICATION_SOURCE');
  assert.equal(data.assets.find(x=>x.path==='.env.production').sha256,null);
  assert.equal(data.assets.find(x=>x.path==='src/env-link').sha256,null);
  assert.equal(data.assets.find(x=>x.path==='src/env-link').category,'SYMLINK_REVIEW');
  assert.equal(data.summary.legal_title_verified,false);
  assert.equal(data.summary.transfer_approved,false);
});

test('exact-SHA manifest refuses tracked worktree modifications', () => {
  const repo=mkdtempSync(join(tmpdir(),'risck-ma-dirty-'));
  execFileSync('git',['init','-q'],{cwd:repo});
  writeFileSync(join(repo,'asset.txt'),'initial content\n');
  execFileSync('git',['add','asset.txt'],{cwd:repo});
  execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','initial'],{cwd:repo});
  writeFileSync(join(repo,'asset.txt'),'changed without commit\n');
  const out=mkdtempSync(join(tmpdir(),'risck-ma-dirty-output-'));
  const result=spawnSync(process.execPath,[script,out],{cwd:repo,encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/uncommitted changes/);
});
