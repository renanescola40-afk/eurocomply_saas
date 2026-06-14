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

for (const [section, values] of Object.entries(pins)) {
  pkg[section] ??= {};
  for (const [name, version] of Object.entries(values)) {
    if (pkg[section][name] === 'latest') {
      pkg[section][name] = version;
      changed.push({ section, name, version });
    }
  }
}

writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(JSON.stringify({ changed, changedCount: changed.length }, null, 2));
