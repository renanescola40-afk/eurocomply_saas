#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assertProfileProof } from './check-supabase-live-profile-proof.mjs';
import { main } from './run-supabase-live-tenant-isolation-v2.mjs';
export * from './supabase-live-rls-evidence.mjs';

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main()
    .then(() => {
      assertProfileProof({ advisory: process.argv.includes('--advisory') });
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
