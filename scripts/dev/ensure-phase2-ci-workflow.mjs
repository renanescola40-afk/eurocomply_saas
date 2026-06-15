#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const workflowPath = '.github/workflows/ci.yml';

const workflow = `name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build
`;

mkdirSync(dirname(workflowPath), { recursive: true });
writeFileSync(workflowPath, workflow);

console.log(`Phase 2 CI workflow ensured at ${workflowPath}.`);
