#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;

// Safe promotion is intentionally limited to the twelve workstreams that can
// be demonstrated by isolated application and contract execution. The final
// three controls remain reserved for the protected closeout campaign:
// READINESS-SCORING, VENDOR-ASSURANCE and PLATFORM-CONTROLS.
const SAFE_PROOFS = [
  ['SCOPE-CLASSIFICATION', 'docs/security/evidence/runtime/authorization-bola-validation.json', 'decision-engine contract suite'],
  ['PROHIBITED-PRACTICES', 'docs/security/evidence/runtime/prohibited-practices-validation.json', 'Article 5 operational API and migration contracts'],
  ['AI-LITERACY', 'docs/security/evidence/runtime/ai-literacy-validation.json', 'AI literacy API, UI and write-boundary contracts'],
  ['ARTICLE-50', 'docs/security/evidence/runtime/localization-validation.json', 'public UX and localization evidence contracts'],
  ['FRIA', 'docs/security/evidence/runtime/fria-operational-validation.json', 'FRIA operational API and migration contracts'],
  ['DEPLOYER', 'docs/security/evidence/runtime/deployer-obligations-validation.json', 'deployer obligations decision contracts'],
  ['HIGH-RISK-PROVIDER', 'docs/security/evidence/runtime/high-risk-provider-validation.json', 'high-risk provider data-governance contracts'],
  ['ANNEX-IV', 'docs/security/evidence/runtime/annex-iv-validation.json', 'Annex IV technical-documentation contracts'],
  ['QMS', 'docs/security/evidence/runtime/qms-validation.json', 'QMS and CAPA operational contracts'],
  ['CONFORMITY', 'docs/security/evidence/runtime/conformity-validation.json', 'conformity, declaration, CE and registration contracts'],
  ['POST-MARKET', 'docs/security/evidence/release/incident-response-validation.json', 'incident and post-market operations contracts'],
  ['GPAI', 'docs/security/evidence/runtime/gpai-validation.json', 'GPAI compliance contracts'],
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function buildSafeRuntimeEvidence({ targetSha, runId, repository, generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(targetSha)) throw new Error('targetSha must be a full lowercase Git SHA');
  if (!/^\d+$/.test(String(runId))) throw new Error('runId must be numeric');
  if (repository !== 'renanescola40-afk/eurocomply_saas') throw new Error('unexpected repository');

  return SAFE_PROOFS.map(([workstreamId, path, proofBoundary]) => {
    const body = {
      schema: 'risck-comply.eu-ai-act-runtime-evidence.v1',
      repository,
      targetSha,
      workflowRunId: String(runId),
      generatedAt,
      workstreamId,
      status: 'VERIFIED',
      environment: 'github-actions-isolated',
      providerMode: 'synthetic-local',
      syntheticData: true,
      proofBoundary,
      redaction: 'No customer data, credentials or provider secrets retained.',
      limitations: [
        'Proves isolated application, scoring and contract behavior only.',
        'Does not prove production provider configuration, customer-data behavior, legal approval, certification or regulator acceptance.',
      ],
    };
    return {
      path,
      document: {
        ...body,
        integrity: { sha256: createHash('sha256').update(JSON.stringify(stable(body))).digest('hex') },
      },
    };
  });
}

function main() {
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const runId = String(process.env.GITHUB_RUN_ID || '').trim();
  const repository = String(process.env.GITHUB_REPOSITORY || '').trim();
  const outputRoot = resolve(process.env.RUNTIME_EVIDENCE_ROOT || 'artifacts/eu-ai-act-safe-runtime-evidence');
  const evidence = buildSafeRuntimeEvidence({ targetSha, runId, repository });

  for (const item of evidence) {
    const output = resolve(outputRoot, item.path);
    if (!output.startsWith(`${outputRoot}/`)) throw new Error(`unsafe output path: ${item.path}`);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(item.document, null, 2)}\n`, { mode: 0o600 });
  }

  console.log(JSON.stringify({ generated: evidence.length, targetSha, outputRoot }));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
