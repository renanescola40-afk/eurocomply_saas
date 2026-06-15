#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const gitignorePath = '.gitignore';
const requiredEntries = [
  'phase2-cicd-report.json',
  'phase2-final-report.txt',
];

const originalContent = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';
const lines = originalContent.split(/\r?\n/);
const existingEntries = new Set(lines.map((line) => line.trim()).filter(Boolean));

let changed = false;

if (!originalContent.includes('# local reports and generated diagnostics')) {
  if (lines.length > 0 && lines.at(-1) !== '') lines.push('');
  lines.push('# local reports and generated diagnostics');
  changed = true;
}

for (const entry of requiredEntries) {
  if (!existingEntries.has(entry)) {
    lines.push(entry);
    changed = true;
  }
}

if (changed) {
  const normalized = `${lines.join('\n').replace(/\n+$/u, '')}\n`;
  writeFileSync(gitignorePath, normalized);
  console.log('Phase 2 .gitignore entries ensured.');
} else {
  console.log('Phase 2 .gitignore entries already present.');
}
