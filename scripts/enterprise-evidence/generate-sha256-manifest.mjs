#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const paths=process.argv.slice(2);if(!paths.length){console.error('Provide one or more repository-relative artifact paths');process.exit(2);}
const files=paths.map(p=>{const b=fs.readFileSync(p);return {path:p,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};});
const out={schema:'risck-comply.enterprise-evidence-sha256-manifest.v1',generated_at:new Date().toISOString(),repository:process.env.GITHUB_REPOSITORY||'renanescola40-afk/eurocomply_saas',source_commit_sha:process.env.GITHUB_SHA||null,hash_algorithm:'SHA-256',files};
const dest=process.env.EVIDENCE_SHA256_OUTPUT||'artifacts/enterprise-evidence-factory/EVIDENCE_SHA256_MANIFEST.json';fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
