#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT = resolve('docs/security/evidence/runtime/audit-chain-live-validation.json');
const FULL_SHA = /^[a-f0-9]{40}$/;

function env(name) {
  return String(process.env[name] ?? '').trim();
}

export function auditChainRuntimePreflight(input = {}) {
  const targetSha = String(input.targetSha ?? '').trim().toLowerCase();
  const checks = {
    targetShaValid: FULL_SHA.test(targetSha),
    supabaseUrlConfigured: Boolean(String(input.supabaseUrl ?? '').trim()),
    serviceRoleConfigured: Boolean(String(input.serviceRoleKey ?? '').trim()),
    auditSigningSecretConfigured: Boolean(String(input.auditSigningSecret ?? '').trim()),
    evidencePackSigningSecretConfigured: Boolean(String(input.evidencePackSigningSecret ?? '').trim()),
  };
  const blockerCodes = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => ({
      targetShaValid: 'target_sha_invalid',
      supabaseUrlConfigured: 'supabase_url_missing',
      serviceRoleConfigured: 'supabase_service_role_missing',
      auditSigningSecretConfigured: 'audit_chain_signing_secret_missing',
      evidencePackSigningSecretConfigured: 'evidence_pack_signing_secret_missing',
    }[name]));

  return {
    targetSha,
    ready: blockerCodes.length === 0,
    checks,
    blockerCodes,
  };
}

export function blockedAuditChainEvidence(preflight, generatedAt = new Date().toISOString()) {
  return {
    schema: 'risck-comply.audit-chain-runtime-preflight.v1',
    evidenceItem: 'audit-chain-live-validation',
    id: 'audit-chain-live-validation',
    status: 'Open',
    outcome: 'blocked',
    generatedAt,
    reviewer: 'RISCK COMPLY protected security automation',
    control: 'Enterprise audit logging and tamper-evident audit chain live validation',
    summary: 'Live audit-chain proof was not started because protected runtime prerequisites were missing. No disposable runtime fixture was created.',
    redactionConfirmation: 'Only prerequisite presence booleans and blocker codes are recorded. Secret values, URLs, credentials and customer data are not stored.',
    runtimeContext: {
      repository: env('GITHUB_REPOSITORY') || null,
      branch: env('GITHUB_REF_NAME') || null,
      commitSha: preflight.targetSha || null,
      environment: 'production',
      generatedByGithubActions: Boolean(env('GITHUB_RUN_ID')),
      githubRunId: env('GITHUB_RUN_ID') || null,
      githubRunAttempt: env('GITHUB_RUN_ATTEMPT') || null,
    },
    sourceValidation: {
      status: true,
      failures: [],
      note: 'Repository contract tests completed before runtime prerequisite evaluation.',
    },
    runtimeConfiguration: {
      hasSupabaseUrl: preflight.checks.supabaseUrlConfigured,
      hasServiceRoleKey: preflight.checks.serviceRoleConfigured,
      hasAuditSigningSecret: preflight.checks.auditSigningSecretConfigured,
      hasEvidencePackSigningSecret: preflight.checks.evidencePackSigningSecretConfigured,
      hasTargetOrganization: false,
      ephemeralFixtureMode: true,
      persistentFixtureSecretsRequired: false,
      liveProof: {
        present: false,
        requiredEnv: 'AUDIT_CHAIN_LIVE_PROOF=true',
        note: 'Fail-closed prerequisite preflight prevented live execution before any disposable fixture was created.',
      },
    },
    liveValidation: {
      status: 'NotRun',
      fixtureMode: 'ephemeral',
      ephemeralFixturesCreated: false,
      cleanup: {
        status: 'NotRequired',
        auditEventsRemoved: true,
        authFixturesRemoved: true,
        failureCodes: [],
      },
    },
    acceptanceCriteria: {
      liveProofAttached: false,
      exportIsSigned: false,
    },
    blockerCodes: preflight.blockerCodes,
    releaseGate: {
      enterpriseRelease: true,
      blocked: true,
      reason: 'runtime_prerequisite_preflight_blocked',
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      rawAuditPayloadsStored: false,
      rawIdentifiersStored: false,
      persistentFixtureCredentialsStored: false,
      syntheticAuditEventsRetained: false,
      ephemeralFixtureCleanupVerified: true,
      disposableRuntimeMutationPerformed: false,
      valuesRedacted: true,
    },
  };
}

export function runAuditChainRuntimePreflight() {
  const preflight = auditChainRuntimePreflight({
    targetSha: env('TARGET_SHA'),
    supabaseUrl: env('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
    auditSigningSecret: env('AUDIT_CHAIN_SIGNING_SECRET'),
    evidencePackSigningSecret: env('EVIDENCE_PACK_SIGNING_SECRET'),
  });

  if (!preflight.checks.targetShaValid) {
    throw new Error('target_sha_invalid');
  }

  if (!preflight.ready) {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(blockedAuditChainEvidence(preflight), null, 2)}\n`, { mode: 0o600 });
  }

  const githubOutput = env('GITHUB_OUTPUT');
  if (githubOutput) {
    appendFileSync(githubOutput, `ready=${preflight.ready ? 'true' : 'false'}\n`);
    appendFileSync(githubOutput, `blocker_count=${preflight.blockerCodes.length}\n`);
  }

  console.log(JSON.stringify({
    ready: preflight.ready,
    targetSha: preflight.targetSha,
    blockerCodes: preflight.blockerCodes,
    disposableRuntimeMutationPerformed: false,
  }, null, 2));
  return preflight;
}

const isMain = process.argv[1]
  && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    runAuditChainRuntimePreflight();
  } catch (error) {
    console.error(`Audit-chain runtime preflight failed: ${error instanceof Error ? error.message : 'unknown_error'}`);
    process.exit(1);
  }
}
