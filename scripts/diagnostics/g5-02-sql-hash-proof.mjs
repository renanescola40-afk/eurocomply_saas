#!/usr/bin/env node
// DAT-01 local source-to-ledger hash diagnostic. Read-only; never replays SQL or grants PASS.
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const digest = s => createHash('sha256').update(s, 'utf8').digest('hex');
const onlyComment = s => !s.replace(/--[^\r\n]*(?=\r?\n|$)/g,'').replace(/\/\*[\s\S]*?\*\//g,'').trim();
export function splitStatements(sql) {
  if (/\bBEGIN\s+ATOMIC\b/i.test(sql) || /\bCOPY\b[^;]*\bFROM\s+STDIN\b/i.test(sql) || /^\s*\\(?:i|set|copy|gexec)\b/im.test(sql)) throw Error('UNSUPPORTED_SQL_DIALECT');
  const out=[]; let start=0,state='code',tag='',depth=0,paren=0;
  for(let i=0;i<sql.length;i++) {
    const c=sql[i], n=sql[i+1];
    if(state==='line'){if(c==='\n')state='code';continue;}
    if(state==='block'){if(c==='/'&&n==='*'){depth++;i++;}else if(c==='*'&&n==='/'){depth--;i++;if(!depth)state='code';}continue;}
    if(state==='single'){if(c==='\\'&&tag==='escape'){i++;continue;}if(c==="'"&&n==="'"){i++;continue;}if(c==="'")state='code';continue;}
    if(state==='double'){if(c==='"'&&n==='"'){i++;continue;}if(c==='"')state='code';continue;}
    if(state==='dollar'){if(sql.startsWith(tag,i)){i+=tag.length-1;state='code';}continue;}
    if(c==='-'&&n==='-'){state='line';i++;continue;}
    if(c==='/'&&n==='*'){state='block';depth=1;i++;continue;}
    if(c==="'"){tag=/[eE]/.test(sql[i-1]||'')&&!/[A-Za-z0-9_$]/.test(sql[i-2]||'')?'escape':'';state='single';continue;}
    if(c==='"'){state='double';continue;}
    if(c==='$'){const m=/^(?:\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/.exec(sql.slice(i));if(m){tag=m[0];state='dollar';i+=tag.length-1;continue;}}
    if(c==='('){paren++;continue;}if(c===')'){if(--paren<0)throw Error('UNBALANCED_PAREN');continue;}
    if(c===';'&&paren===0){const part=sql.slice(start,i).trim();if(part&&!onlyComment(part))out.push(part);start=i+1;}
  }
  if(!['code','line'].includes(state)||paren!==0)throw Error('UNTERMINATED_SQL');
  const end=sql.slice(start).trim();if(end&&!onlyComment(end))throw Error('TRAILING_SQL_WITHOUT_SEMICOLON');
  return out;
}
export function compareLedger({ ledger,crosswalk,provider,readSource }) {
  const versions=ledger?.versions||[],entries=crosswalk?.entries||[],rows=provider?.rows||[];
  if(versions.length!==137||entries.length!==137||rows.length!==137||new Set(versions).size!==137)throw Error('LEDGER_CARDINALITY');
  const results=[];
  for(let i=0;i<137;i++){
    const v=versions[i],e=entries[i],p=rows[i];
    if(!/^\d{14}$/.test(v)||e?.production_version!==v||e?.order!==i+1||p?.version!==v||p?.name!==e?.production_name)throw Error('ORDER_OR_IDENTITY_'+(i+1));
    if(!/^supabase\/migrations\/[A-Za-z0-9_-]+\.sql$/.test(e.source)||!(/^[a-f0-9]{64}$/.test(p.joined_statement_sha256)))throw Error('UNTRUSTED_PATH_OR_HASH_'+(i+1));
    let status='UNVERIFIED',reason=null;
    try{
      const statements=splitStatements(readSource(e.source));
      const text=statements.join('\n');
      const matched=statements.length===p.statement_count&&Buffer.byteLength(text,'utf8')===p.joined_bytes&&digest(text)===p.joined_statement_sha256;
      status=e.mapping==='exact_version'?(matched?'EXACT_HASH_MATCH':'EXACT_HASH_MISMATCH'):(matched?'NON_EXACT_HASH_MATCH_REVIEW':'NON_EXACT_MAPPING_REVIEW');
    }catch(err){status='SOURCE_UNVERIFIED';reason=String(err?.message||err).replace(/[^A-Z0-9_]/g,'_').slice(0,80);}
    results.push({version:v,name:p.name,mapping:e.mapping,status,...(reason?{reason}:{} )});
  }
  const count=status=>results.filter(x=>x.status===status).length;
  return {schema:'risck-comply.dat01.source-hash.v1',counts:{total:137,exactMatch:count('EXACT_HASH_MATCH'),exactMismatch:count('EXACT_HASH_MISMATCH'),nonExactMatchNeedsReview:count('NON_EXACT_HASH_MATCH_REVIEW'),nonExactNeedsReview:count('NON_EXACT_MAPPING_REVIEW'),unverified:count('SOURCE_UNVERIFIED')},results,sqlReplay:'NOT_EXECUTED',formalAcceptance:'NOT_GRANTED',status:'DIAGNOSTIC_ONLY'};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  const root=resolve(process.cwd()),migrationRoot=realpathSync(resolve(root,'supabase/migrations'));
  const json=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
  const result=compareLedger({ledger:json('scripts/diagnostics/g5-02-prod-ledger-versions.json'),crosswalk:json('supabase/reconciliation/20261022_production_migration_source_crosswalk.json'),provider:json('docs/enterprise/closure-v20/DAT01_PROD_LEDGER_READONLY_HASHES_20261103.json'),readSource:path=>{
    const file=realpathSync(resolve(root,path));if(!file.startsWith(migrationRoot+sep))throw Error('OUTSIDE_MIGRATION_DIRECTORY');return readFileSync(file,'utf8');
  }});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(process.argv.includes('--strict')&&(result.counts.exactMatch!==112||result.counts.nonExactMatchNeedsReview||result.counts.nonExactNeedsReview||result.counts.exactMismatch||result.counts.unverified))process.exitCode=1;
}
