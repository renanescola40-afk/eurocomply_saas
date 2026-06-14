#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();
const docsDir = join(root, 'docs');
const outputPath = process.argv[2] || 'docs-manifest.json';

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

if (!existsSync(docsDir)) {
  throw new Error('docs directory was not found');
}

const files = walk(docsDir)
  .map((filePath) => {
    const buffer = readFileSync(filePath);
    const stats = statSync(filePath);
    return {
      path: relative(root, filePath).replaceAll('\\', '/'),
      bytes: stats.size,
      sha256: sha256(buffer),
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  generatedAt: new Date().toISOString(),
  root: 'docs',
  count: files.length,
  files,
};

const absoluteOutputPath = join(root, outputPath);
mkdirSync(dirname(absoluteOutputPath), { recursive: true });
writeFileSync(absoluteOutputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote docs manifest with ${files.length} files to ${outputPath}`);
