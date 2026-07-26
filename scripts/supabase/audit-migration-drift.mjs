#!/usr/bin/env node

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = process.argv[2] ?? 'supabase/migrations';
const remoteListPath = process.argv[3] ?? 'migration-state-remote.txt';
const outputDir = process.argv[4] ?? 'artifacts/supabase-migration-drift';

function parseLocalFilename(filename) {
  if (!filename.endsWith('.sql')) return null;
  const match = filename.match(/^([^_]+)_(.+)\.sql$/);
  if (!match) {
    return { filename, version: null, name: null, validShape: false, validTimestamp: false };
  }

  const [, version, name] = match;
  const validShape = /^\d{14}$/.test(version);
  let validTimestamp = false;

  if (validShape) {
    const year = Number(version.slice(0, 4));
    const month = Number(version.slice(4, 6));
    const day = Number(version.slice(6, 8));
    const hour = Number(version.slice(8, 10));
    const minute = Number(version.slice(10, 12));
    const second = Number(version.slice(12, 14));
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    validTimestamp =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day &&
      date.getUTCHours() === hour &&
      date.getUTCMinutes() === minute &&
      date.getUTCSeconds() === second;
  }

  return { filename, version, name, validShape, validTimestamp };
}

function parseRemoteList(text) {
  const versions = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('|')) continue;
    const columns = line.split('|').map((value) => value.trim());
    const local = columns[0] ?? '';
    const remote = columns[1] ?? '';
    if (/^\d+$/.test(remote)) versions.add(remote);
    if (!remote && /^\d+$/.test(local) && /remote/i.test(line)) versions.add(local);
  }
  return versions;
}

function markdownList(items, formatter) {
  if (items.length === 0) return '- None\n';
  return items.map((item) => `- ${formatter(item)}`).join('\n') + '\n';
}

const localFiles = (await readdir(migrationsDir)).sort();
const local = localFiles.map(parseLocalFilename).filter(Boolean);
const remoteText = await readFile(remoteListPath, 'utf8');
const remoteVersions = parseRemoteList(remoteText);

const byVersion = new Map();
for (const migration of local) {
  const key = migration.version ?? `invalid:${migration.filename}`;
  const entries = byVersion.get(key) ?? [];
  entries.push(migration);
  byVersion.set(key, entries);
}

const duplicateVersions = [...byVersion.entries()]
  .filter(([version, entries]) => !version.startsWith('invalid:') && entries.length > 1)
  .map(([version, entries]) => ({ version, files: entries.map((entry) => entry.filename) }));

const invalidLocal = local.filter((migration) => !migration.validShape || !migration.validTimestamp);
const localValidVersions = new Set(
  local.filter((migration) => migration.validShape && migration.validTimestamp).map((migration) => migration.version),
);

const aligned = [...localValidVersions].filter((version) => remoteVersions.has(version)).sort();
const localOnly = [...localValidVersions].filter((version) => !remoteVersions.has(version)).sort();
const remoteOnly = [...remoteVersions].filter((version) => !localValidVersions.has(version)).sort();

const status = duplicateVersions.length > 0 || invalidLocal.length > 0 || remoteOnly.length > 0
  ? 'CRITICAL_DRIFT'
  : localOnly.length > 0
    ? 'PENDING_LOCAL_MIGRATIONS'
    : 'ALIGNED';

const report = {
  generatedAt: new Date().toISOString(),
  status,
  summary: {
    localFiles: local.length,
    localValidVersions: localValidVersions.size,
    remoteVersions: remoteVersions.size,
    aligned: aligned.length,
    localOnly: localOnly.length,
    remoteOnly: remoteOnly.length,
    invalidLocal: invalidLocal.length,
    duplicateVersions: duplicateVersions.length,
  },
  aligned,
  localOnly,
  remoteOnly,
  invalidLocal,
  duplicateVersions,
  safety: {
    databaseModified: false,
    migrationHistoryModified: false,
    includeAllUsed: false,
    recommendation: 'Review evidence before any migration repair or deployment.',
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'migration-drift.json'), JSON.stringify(report, null, 2) + '\n');

let markdown = '# Supabase migration drift audit\n\n';
markdown += `Generated: ${report.generatedAt}\n\n`;
markdown += `Status: **${status}**\n\n`;
markdown += '## Summary\n\n';
markdown += `- Local migration files: ${report.summary.localFiles}\n`;
markdown += `- Valid unique local versions: ${report.summary.localValidVersions}\n`;
markdown += `- Remote versions: ${report.summary.remoteVersions}\n`;
markdown += `- Aligned versions: ${report.summary.aligned}\n`;
markdown += `- Local-only versions: ${report.summary.localOnly}\n`;
markdown += `- Remote-only versions: ${report.summary.remoteOnly}\n`;
markdown += `- Invalid local filenames/timestamps: ${report.summary.invalidLocal}\n`;
markdown += `- Duplicate local versions: ${report.summary.duplicateVersions}\n\n`;
markdown += '## Invalid local migrations\n\n';
markdown += markdownList(invalidLocal, (item) => `\`${item.filename}\``);
markdown += '\n## Duplicate versions\n\n';
markdown += markdownList(duplicateVersions, (item) => `\`${item.version}\`: ${item.files.map((file) => `\`${file}\``).join(', ')}`);
markdown += '\n## Local-only valid versions\n\n';
markdown += markdownList(localOnly, (version) => `\`${version}\``);
markdown += '\n## Remote-only versions\n\n';
markdown += markdownList(remoteOnly, (version) => `\`${version}\``);
markdown += '\n## Safety boundary\n\n';
markdown += '- Read-only audit; no database objects or migration history were changed.\n';
markdown += '- Do not use `supabase db push --include-all` to bypass this report.\n';
markdown += '- Reconciliation requires object-level evidence and explicit review.\n';

await writeFile(path.join(outputDir, 'migration-drift.md'), markdown);
process.stdout.write(markdown);

if (status === 'CRITICAL_DRIFT') process.exitCode = 2;
