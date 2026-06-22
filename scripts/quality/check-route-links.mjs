#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src/app', 'src/components', 'src/lib', 'src/server'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const BLOCKED_PATTERNS = [
  /\/undefined\//,
  /\/undefined(?:["'`\s)>]|$)/,
  /\$\{[^}]*undefined[^}]*\}/,
];
const ADVISORY_PATTERNS = [
  /dashboard\/organizations\/vendors/,
  /dashboard\/organizations\/risks/,
  /dashboard\/organizations\/documents/,
  /dashboard\/organizations\/tasks/,
  /dashboard\/organizations\/reports(?!-governance)/,
];

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

const files = SCAN_DIRS.flatMap(walk);
const failures = [];
const advisories = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const rel = relative(ROOT, file);

  lines.forEach((line, index) => {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(line)) {
        failures.push({ file: rel, line: index + 1, reason: `blocked route pattern ${pattern}` });
      }
    }

    for (const pattern of ADVISORY_PATTERNS) {
      if (pattern.test(line)) {
        advisories.push({ file: rel, line: index + 1, reason: `legacy organization route pattern ${pattern}` });
      }
    }
  });
}

if (advisories.length > 0) {
  console.log('Route link advisories:');
  for (const advisory of advisories) {
    console.log(`- ${advisory.file}:${advisory.line} ${advisory.reason}`);
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
