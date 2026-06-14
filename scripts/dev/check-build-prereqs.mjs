#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.mjs',
];

const requiredScripts = [
  'build',
  'typecheck',
  'test',
];

const requiredRuntimeDeps = [
  'next',
  'react',
  'react-dom',
  '@supabase/supabase-js',
  'zod',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(join(root, file)));

if (missingFiles.length > 0) {
  console.error('Missing required files:');
  for (const file of missingFiles) console.error(`- ${file}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

const missingScripts = requiredScripts.filter((script) => !scripts[script]);
const missingDeps = requiredRuntimeDeps.filter((dep) => !deps[dep]);

if (missingScripts.length > 0 || missingDeps.length > 0) {
  if (missingScripts.length > 0) {
    console.error('Missing required scripts:');
    for (const script of missingScripts) console.error(`- ${script}`);
  }

  if (missingDeps.length > 0) {
    console.error('Missing required dependencies:');
    for (const dep of missingDeps) console.error(`- ${dep}`);
  }

  process.exit(1);
}

console.log('Build prerequisites look ready.');
