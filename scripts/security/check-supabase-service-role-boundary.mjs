#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const scanRoots = ['src', 'app', 'components', 'lib']
  .map((dir) => join(root, dir))
  .filter((dir) => existsSync(dir));
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);
const sourceExtensions = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const serviceRoleEnvPattern = /\b(?:NEXT_PUBLIC_)?SUPABASE_SERVICE_ROLE_KEY\b|\bSERVICE_ROLE_KEY\b/i;
const publicServiceRolePattern = /\bNEXT_PUBLIC_[A-Z0-9_]*SERVICE[A-Z0-9_]*ROLE[A-Z0-9_]*\b/i;
const adminImportPattern = /@\/lib\/supabase\/admin|createAdminSupabaseClient|createServiceRoleClient/i;

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }
    if (!entry.isFile() || !sourceExtensions.test(entry.name)) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function hasUseClientDirective(source) {
  const firstStatements = source
    .split('\n')
    .slice(0, 8)
    .map((line) => line.trim().replace(/;$/, ''));

  return firstStatements.includes("'use client'") || firstStatements.includes('"use client"');
}

function isClientNamedFile(path) {
  return /(^|\/)([^/]+-client|client|.*\.client)\.(tsx|ts|jsx|js)$/.test(path);
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

const failures = [];

for (const file of scanRoots.flatMap(walk)) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');
  const clientBoundary = hasUseClientDirective(source) || isClientNamedFile(normalized);

  for (const match of source.matchAll(new RegExp(publicServiceRolePattern, 'gi'))) {
    failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} defines or references a NEXT_PUBLIC service-role-like variable`);
  }

  if (!clientBoundary) continue;

  for (const match of source.matchAll(new RegExp(serviceRoleEnvPattern, 'gi'))) {
    failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} client boundary references a Supabase service role secret`);
  }

  for (const match of source.matchAll(new RegExp(adminImportPattern, 'gi'))) {
    failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} client boundary imports or references a Supabase admin/service-role path`);
  }
}

console.log('Supabase service role boundary check');
console.log('------------------------------------');
console.log(`Scanned ${scanRoots.length} source roots.`);

if (failures.length > 0) {
  console.error('Service role boundary findings:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Service role boundary: ok');
}
