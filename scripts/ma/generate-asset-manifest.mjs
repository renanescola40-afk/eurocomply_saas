#!/usr/bin/env node
/**
 * Offline M&A inventory. Uses Git-tracked paths only and never contacts production.
 * Run: node scripts/ma/generate-asset-manifest.mjs [output-directory]
 * Output contains path/hash/size/classification, never file contents or credentials.
 * Review outputs locally; do not publish confidential file paths to a buyer automatically.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const out = resolve(process.argv[2] || '/tmp/risck-ma-asset-manifest');
if (!out.startsWith('/tmp/') || out === '/tmp') {
  throw new Error('Safety guard: choose an output directory under /tmp. Do not commit generated manifests without review.');
}
const paths = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString('utf8').split('\0').filter(Boolean);
const classify = p => {
  if (p.startsWith('supabase/migrations/')) return 'DATABASE_MIGRATION';
  if (p.startsWith('.github/')) return 'CI_RELEASE';
  if (p.startsWith('scripts/security/')) return 'SECURITY_TOOLING';
  if (p.startsWith('src/app/api/') || /\/api\//.test(p)) return 'API_INTEGRATION';
  if (p.startsWith('src/')) return 'APPLICATION_SOURCE';
  if (p.startsWith('public/')) return 'DESIGN_BRAND_ASSET';
  if (p.startsWith('docs/')) return 'DOCUMENTATION';
  if (p.startsWith('supabase/')) return 'DATA_INFRASTRUCTURE';
  if (p.startsWith('scripts/')) return 'ENGINEERING_TOOLING';
  if (/^(package(-lock)?\.json|.*\.config\.[^.]+|vercel\.json)$/.test(p)) return 'DEPENDENCY_OR_CONFIG';
  return 'OTHER_REVIEW';
};
const sensitive = p => /(^|\/)(\.env(\.|$)|\.npmrc$|\.p12$|\.pem$|id_rsa$|.*secret.*|.*credential.*|.*private.key$)/i.test(p);
const rows = [];
for (const p of paths) {
  if (sensitive(p)) { rows.push({path:p,category:'RESTRICTED_REVIEW',size:null,sha256:null,transfer:'EXCLUDE_PENDING_SECURITY_REVIEW'}); continue; }
  const full=join(root,p);
  if (!existsSync(full)) continue;
  const s=lstatSync(full);
  if (s.isSymbolicLink()) { rows.push({path:p,category:'SYMLINK_REVIEW',size:null,sha256:null,transfer:'EXCLUDE_PENDING_SECURITY_REVIEW'}); continue; }
  if (!s.isFile()) continue;
  const hash=createHash('sha256').update(readFileSync(full)).digest('hex');
  rows.push({path:p,category:classify(p),size:s.size,sha256:hash,transfer:'UNREVIEWED_LEGAL_TITLE_AND_LICENSE'});
}
const summary={schema:'risck-ma-manifest-v1',git_sha:sha,tracked_paths:paths.length,files_recorded:rows.length,restricted_paths:rows.filter(x=>['RESTRICTED_REVIEW','SYMLINK_REVIEW'].includes(x.category)).length,legal_title_verified:false,transfer_approved:false,generated_at:new Date().toISOString()};
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'manifest.json'), JSON.stringify({summary,assets:rows},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({output:join(out,'manifest.json'),summary},null,2));
