import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectEvidencePages } from '../../src/lib/evidence/report-pagination.ts';

const fixtures = (n) => Array.from({ length: n }, (_, i) => ({ id: 'e-' + String(i).padStart(5,'0'), status: i % 2 ? 'draft' : 'valid' }));

test('reads 551 evidence records across three pages without truncation', async () => {
  const data=fixtures(551); const calls=[];
  const result=await collectEvidencePages(async (from,size) => {calls.push([from,size]);return data.slice(from,from+size)}, {pageSize:250,maxItems:1000});
  assert.equal(result.length,551);assert.deepEqual(calls,[[0,250],[250,250],[500,250]]);
});
test('returns genuine zero evidence', async ()=>{
  assert.deepEqual(await collectEvidencePages(async()=>[]),[]);
});
test('checks one additional page when prior page exactly full',async()=>{
  const data=fixtures(500);const calls=[];
  const result=await collectEvidencePages(async(from,size)=>{calls.push(from);return data.slice(from,from+size)},{pageSize:250});
  assert.equal(result.length,500);assert.deepEqual(calls,[0,250,500]);
});
test('rejects duplicate identities across pages',async()=>{
  const data=fixtures(2);
  await assert.rejects(()=>collectEvidencePages(async(from)=>from===0?data:[{id:data[1].id,status:'valid'}],{pageSize:2}),/duplicate/i);
});
test('propagates denied read without fabricating zero evidence',async()=>{
  await assert.rejects(()=>collectEvidencePages(async()=>{throw new Error('RLS denied')}),/RLS denied/);
});
test('rejects over-limit reports rather than publishing partial metrics',async()=>{
  const data=fixtures(12);
  await assert.rejects(()=>collectEvidencePages(async(from,size)=>data.slice(from,from+size),{pageSize:5,maxItems:10}),/limit/i);
});
test('rejects invalid page sizing and oversized page',async()=>{
  await assert.rejects(()=>collectEvidencePages(async()=>[],{pageSize:0}),/page size/i);
  await assert.rejects(()=>collectEvidencePages(async()=>fixtures(5),{pageSize:2}),/page size/i);
});
test('rejects records missing a stable id',async()=>{
  await assert.rejects(()=>collectEvidencePages(async()=>[{id:'',status:'valid'}]),/identifier/i);
});
