#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src/app', 'src/components', 'src/lib', 'src/server'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const BAD_SEGMENT = 'undefined';
const BLOCKED_PATTERNS = [
  new RegExp(`/${BAD_SEGMENT}/`),
  new RegExp(`/${BAD_SEGMENT}(?:["'\\`\\s)>]|$)`),
  new RegExp(`\\$\\{[^}]*${BAD_SEGMENT}[^}]*\\}`),
];
const SUSPICIOUS_PATTERNS = [
  /dashboard\/organizations\/vendors/,
  /dashboard\/organizations\/risks/,
  /dashboard\/organizations\/documents/,
  /dashboard\/organizations\/tasks/,
  /dashboard\/organizations\/reports(?!-governance)/,
];
const EDITORIAL_COPY_FILES = new Set(['src/components/marketing/public-info-page.tsx']);

function walk(dir) {
  const abs = join(ROOT, dir);
  let entries = [];

  try {
    entries = readdirSync(abs);
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const path = join(abs, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry)) return [];
      return walk(relative(ROOT, path));
    }

    const dotIndex = entry.lastIndexOf('.');
    const ext = dotIndex >= 0 ? entry.slice(dotIndex) : '';
    return EXTENSIONS.has(ext) ? [path] : [];
  });
}

function isEditorialRouteHealthCopy(rel, line) {
  if (!EDITORIAL_COPY_FILES.has(rel)) return false;
  return line.includes('route checks') || line.includes('checked by CI') || line.includes('Route health');
}

const files = SCAN_DIRS.flatMap(walk);
const failures = [];
const warnings = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const rel = relative(ROOT, file);

  lines.forEach((line, index) => {
    if (!isEditorialRouteHealthCopy(rel, line)) {
      for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(line)) {
          failures.push({ file: rel, line: index + 1, reason: `blocked route pattern ${pattern}` });
        }
      }
    }

    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(line)) {
        warnings.push({ file: rel, line: index + 1, reason: `legacy organization route pattern ${pattern}` });
      }
    }
  });
}

if (warnings.length > 0) {
  console.warn('Route link warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning.file}:${warning.line} ${warning.reason}`);
  }
}

if (failures.length > 0) {
  console.error('Route link check failed:');
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} ${failure.reason}`);
  }
  process.exit(1);
}

console.log(`Route link check passed. Scanned ${files.length} files.`);
