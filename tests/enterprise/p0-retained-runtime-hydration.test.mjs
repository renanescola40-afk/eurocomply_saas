import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  RETAINED_RUNTIME_PRODUCERS,
  hydrateEnterpriseRetainedRuntimeEvidence,
} from '../../scripts/release/hydrate-enterprise-retained-runtime-evidence.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const SHA = 'a'.repeat(40);
const RETAINED_EXACT_SHA_FETCHERS = [
  'scripts/enterprise/fetch-auth-rbac-evidence.mjs',
  'scripts/enterprise/fetch-supabase-rls-evidence.mjs',
  'scripts/enterprise/fetch-upload-scanner-runtime-evidence.mjs',
  'scripts/enterprise/fetch-audit-chain-runtime-evidence.mjs',
  'scripts/enterprise/fetch-production-provider-runtime-evidence.mjs',
  'scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs',
  'scripts/enterprise/fetch-step-up-runtime-evidence.mjs',
  'scripts/enterprise/fetch-stripe-promoted-runtime-evidence.mjs',
];
const P0_EXACT_SHA_FETCHERS = [
  ...RETAINED_EXACT_SHA_FETCHERS,
  'scripts/enterprise/fetch-production-runtime-evidence.mjs',
  'scripts/enterprise/fetch-public-production-final-evidence.mjs',
];

function fetchersWithFailure(failingKey) {
  return Object.fromEntries(RETAINED_RUNTIME_PRODUCERS.map((producer) => [
    producer.key,
    async () => {
      if (producer.key === failingKey) throw new Error('synthetic_invalid_artifact:details_not_for_manifest');
      return { found: false, reason: 'synthetic_missing' };
    },
  ]));
}

async function withTempRoot(fn) {
  const root = await mkdtemp(join(tmpdir(), 'risck-p0-hydration-'));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('diagnostic mode reports an invalid optional producer as missing without granting credit', async () => {
  await withTempRoot(async (root) => {
    const manifest = await hydrateEnterpriseRetainedRuntimeEvidence({
      root,
      repository: REPOSITORY,
      token: 'synthetic-token',
      targetSha: SHA,
      optionalProducerErrorsAsMissing: true,
      fetchers: fetchersWithFailure('supabaseRls'),
    });

    const supabase = manifest.producers.find((producer) => producer.key === 'supabaseRls');
    assert.equal(supabase?.found, false);
    assert.equal(supabase?.reason, 'producer_validation_error:synthetic_invalid_artifact');
    assert.equal(manifest.producerValidationErrorCount, 1);
    assert.equal(manifest.optionalProducerErrorsAsMissing, true);
    assert.equal(manifest.hydratedProducerCount, 0);
    assert.match(manifest.truthBoundary, /receive no PASS credit/);
  });
});

test('release mode still fails closed on the same invalid optional producer', async () => {
  await withTempRoot(async (root) => {
    await assert.rejects(
      hydrateEnterpriseRetainedRuntimeEvidence({
        root,
        repository: REPOSITORY,
        token: 'synthetic-token',
        targetSha: SHA,
        fetchers: fetchersWithFailure('supabaseRls'),
      }),
      /synthetic_invalid_artifact/,
    );
  });
});

test('diagnostic mode never suppresses an invalid trigger-bound producer', async () => {
  await withTempRoot(async (root) => {
    const producer = RETAINED_RUNTIME_PRODUCERS.find((candidate) => candidate.key === 'supabaseRls');
    assert.ok(producer);

    await assert.rejects(
      hydrateEnterpriseRetainedRuntimeEvidence({
        root,
        repository: REPOSITORY,
        token: 'synthetic-token',
        targetSha: SHA,
        sourceWorkflowPath: producer.workflowPath,
        sourceRunId: '12345',
        optionalProducerErrorsAsMissing: true,
        fetchers: fetchersWithFailure('supabaseRls'),
      }),
      /synthetic_invalid_artifact/,
    );
  });
});

test('every retained producer is covered by the exact-SHA query contract', () => {
  assert.equal(RETAINED_EXACT_SHA_FETCHERS.length, RETAINED_RUNTIME_PRODUCERS.length);
});

test('every P0 workflow-run fetcher bounds lookup to the exact target SHA before local filtering', () => {
  for (const file of P0_EXACT_SHA_FETCHERS) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /head_sha=\$\{encodeURIComponent\(targetSha\)\}/, `${file} must query GitHub by exact target SHA`);
    assert.match(source, /per_page=20/, `${file} must keep the exact-SHA response window bounded`);
    assert.doesNotMatch(source, /status=success&branch=main&per_page=(?:50|100)/, `${file} must not list broad main runs before SHA filtering`);
  }
});
