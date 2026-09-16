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

export function resolveAuthorityBinding(env = process.env) {
  const mode = String(env.AUTHORITY_MODE ?? '').trim();
  const authorityRunId = String(env.AUTHORITY_RUN_ID ?? '').trim();
  const promotionRunId = String(env.PROMOTION_RUN_ID ?? '').trim();
  const confirmation = String(env.INPUT_CONFIRMATION ?? '').trim();

  if (!mode) {
    if (/^\d+$/.test(promotionRunId)) {
      return {
        valid: true,
        mode: 'legacy-promotion',
        runId: promotionRunId,
        compatibilityPromotionRunId: promotionRunId,
      };
    }
    return { valid: false, reason: 'governed authority run is not bound' };
  }

  if (mode === 'promotion') {
    if (!/^\d+$/.test(authorityRunId)) {
      return { valid: false, reason: 'AUTHORITY_RUN_ID is not bound to the promotion authority' };
    }
    if (confirmation !== 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF') {
      return { valid: false, reason: 'promotion authority confirmation is invalid' };
    }
    if (promotionRunId && promotionRunId !== authorityRunId) {
      return { valid: false, reason: 'promotion authority run IDs do not match' };
    }
    return {
      valid: true,
      mode,
      runId: authorityRunId,
      compatibilityPromotionRunId: authorityRunId,
    };
  }

  if (mode === 'reattestation') {
    if (!/^\d+$/.test(authorityRunId)) {
      return { valid: false, reason: 'AUTHORITY_RUN_ID is not bound to the reattestation authority' };
    }
    if (confirmation !== 'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF') {
      return { valid: false, reason: 'reattestation authority confirmation is invalid' };
    }
    if (promotionRunId && promotionRunId !== authorityRunId) {
      return { valid: false, reason: 'legacy promotion binding conflicts with reattestation authority' };
    }
    return {
      valid: true,
      mode,
      runId: authorityRunId,
      // v4 still consumes PROMOTION_RUN_ID as a numeric compatibility guard only.
      // Provenance is validated fail-closed by AUTHORITY_MODE/AUTHORITY_RUN_ID in the governed workflow.
      compatibilityPromotionRunId: authorityRunId,
    };
  }

  return { valid: false, reason: `unsupported authority mode: ${mode}` };
}

if (isCli) {
  const advisory = process.argv.includes('--advisory');
  const authorityBinding = resolveAuthorityBinding();
  const hasRuntime = hasLiveRuntimeConfiguration();

  if (advisory && (!hasRuntime || !authorityBinding.valid)) {
    const reason = !hasRuntime
      ? 'protected runtime credentials are unavailable'
      : authorityBinding.reason;
    console.log(`Supabase live tenant-isolation validation skipped in advisory CI: ${reason}.`);
    console.log('No runtime completion is claimed; the protected authority-bound workflow is authoritative.');
    process.exit(0);
  }

  if (!authorityBinding.valid) {
    console.error(authorityBinding.reason);
    process.exit(1);
  }

  process.env.PROMOTION_RUN_ID = authorityBinding.compatibilityPromotionRunId;

  main()
    .then(() => assertProfileProof({ advisory }))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
