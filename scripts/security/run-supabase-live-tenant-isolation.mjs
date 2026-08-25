#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assertProfileProof } from './check-supabase-live-profile-proof.mjs';
import { main } from './run-supabase-live-tenant-isolation-v4.mjs';
export * from './supabase-live-rls-evidence.mjs';

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

function hasLiveRuntimeConfiguration() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim());
  const hasPrivilegedKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      || process.env.SUPABASE_SECRET_KEY?.trim()
      || process.env.SUPABASE_ACCESS_TOKEN?.trim(),
  );
  return hasUrl && hasPrivilegedKey;
}

function hasPromotionRunBinding() {
  return /^\d+$/.test(String(process.env.PROMOTION_RUN_ID ?? '').trim());
}

if (isCli) {
  const advisory = process.argv.includes('--advisory');
  if (advisory && (!hasLiveRuntimeConfiguration() || !hasPromotionRunBinding())) {
    const reason = hasLiveRuntimeConfiguration()
      ? 'PROMOTION_RUN_ID is not bound to this advisory run'
      : 'protected runtime credentials are unavailable';
    console.log(`Supabase live tenant-isolation validation skipped in advisory CI: ${reason}.`);
    console.log('No runtime completion is claimed; the protected promotion-bound workflow is authoritative.');
    process.exit(0);
  }

  main()
    .then(() => assertProfileProof({ advisory }))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
