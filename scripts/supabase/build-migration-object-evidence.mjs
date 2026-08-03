#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { runMigrationObjectEvidence } from './migration-object-evidence-core.mjs';

export {
  candidateFor,
  compareWithLiveCatalog,
  extractObjects,
  extractStatementEvidence,
  parseCatalog,
  runMigrationObjectEvidence,
  sha256,
  splitSqlStatements,
} from './migration-object-evidence-core.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrationObjectEvidence().catch((error) => {
    console.error(`Migration object evidence generation failed: ${error.message}`);
    process.exit(1);
  });
}
