#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const path = 'package.json';
const pkg = JSON.parse(readFileSync(path, 'utf8'));

const pins = {
  dependencies: {
    '@emotion/is-prop-valid': '1.3.1',
    'framer-motion': '12.23.24',
    vaul: '1.1.2',
  },
};

const changed = [];
const alreadyPinned = [];
const missing = [];

for (const [section, values] of Object.entries(pins)) {
  pkg[section] ??= {};
  for (const [name, version] of Object.entries(values)) {
    if (!(name in pkg[section])) {
      missing.push({ section, name, expectedVersion: version });
      continue;
    }

    if (pkg[section][name] === 'latest') {
      pkg[section][name] = version;
      changed.push({ section, name, version });
      continue;
    }

    alreadyPinned.push({ section, name, version: pkg[section][name] });
  }
}

writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);

const report = {
  generatedAt: new Date().toISOString(),
  packageFile: path,
  changedCount: changed.length,
  changed,
  alreadyPinned,
  missing,
};

writeFileSync('dependency-pin-change-report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
