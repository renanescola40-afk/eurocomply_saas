#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import { resolveEvidenceShaBinding } from '../release/evidence-sha-binding.mjs';

const execFile = promisify(execFileCallback);
const FULL_SHA = /^[a-f0-9]{40}$/;
const API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';

function contract(spec) {
  return Object.freeze(spec);
}

function alternativeSource(spec) {
  return Object.freeze(spec);
}

export const FINAL_AUTHORITY_PRODUCERS = Object.freeze([
  Object.freeze({
    id: 'product-commercial-qa',
    scope: 'internal',
    workflow: 'product-fria-ephemeral-qa.yml',
    workflowPath: '.github/workflows/product-fria-ephemeral-qa.yml',
    artifact: (sha) => `product-fria-runtime-${sha}`,
    evidenceBasename: 'fria-runtime-evidence.json',
    allowedEvents: Object.freeze(['push', 'workflow_dispatch']),
    evidenceContract: contract({
      schema: 'risck-comply.product-fria-runtime-acceptance.v2',
      outcome: 'passed',
    }),
  }),
  Object.freeze({
    id: 'billing-product-live-closure',
    scope: 'internal',
    workflow: 'final-billing-product-live-closeout.yml',
    workflowPath: '.github/workflows/final-billing-product-live-closeout.yml',
    artifact: (sha) => `final-billing-product-live-closeout-${sha}`,
    evidenceBasename: 'final-billing-product-live-closeout.json',
    allowedEvents: Object.freeze(['workflow_dispatch']),
    evidenceContract: contract({
      schema: 'risck-comply.final-billing-product-live-closeout.v1',
      evidenceItem: 'final-billing-product-live-closeout',
      status: 'Complete',
      outcome: 'passed',
      decision: 'BILLING_PRODUCT_EU_AI_ACT: PASS',
      emptyArrayFields: Object.freeze(['blockerCodes']),
    }),
  }),
  Object.freeze({
    id: 'supabase-production-acceptance',
    scope: 'internal',
    workflow: 'supabase-forward-production-acceptance.yml',
    workflowPath: '.github/workflows/supabase-forward-production-acceptance.yml',
    alternativeSources: Object.freeze([
      alternativeSource({
        workflow: 'supabase-forward-production-reattestation.yml',
        workflowPath: '.github/workflows/supabase-forward-production-reattestation.yml',
        allowedEvents: Object.freeze(['workflow_dispatch']),
      }),
    ]),
    artifact: (sha) => `supabase-forward-production-acceptance-${sha}`,
    evidenceBasename: 'production-acceptance.json',
    allowedEvents: Object.freeze(['workflow_dispatch']),
    evidenceContract: contract({
      schema: 'risck-comply.supabase-forward-production-acceptance.v1',
      evidenceItem: 'supabase-forward-production-acceptance',
      status: 'Complete',
      outcome: 'passed',
    }),
  }),
  Object.freeze({
    id: 'production-provider-runtime',
    scope: 'internal',
    workflow: 'production-provider-runtime-proof.yml',
    workflowPath: '.github/workflows/production-provider-runtime-proof.yml',
    artifact: (sha) => `production-provider-runtime-proof-${sha}`,
    evidenceBasename: 'production-secrets-provider-stores.json',
    allowedEvents: Object.freeze(['push', 'workflow_dispatch']),
    evidenceContract: contract({
      schema: 'risck-comply.production-provider-runtime-evidence.v2',
      evidenceItem: 'production-secrets-provider-stores',
      status: 'Complete',
      outcome: 'passed',
    }),
  }),
  Object.freeze({
    id: 'external-security-assurance',
    scope: 'external',
    workflow: 'external-security-assurance.yml',
    workflowPath: '.github/workflows/external-security-assurance.yml',
    artifact: (sha) => `external-security-assurance-accepted-${sha}`,
    evidenceBasename: 'external-security-assurance-decision.json',
    allowedEvents: Object.freeze(['workflow_dispatch']),
    evidenceContract: contract({
      schema: 'risck-comply.external-security-assurance-acceptance.v2',
      decision: 'ACCEPTED_FOR_ENTERPRISE_PROMOTION',
      emptyArrayFields: Object.freeze(['blockers']),
    }),
  }),
]);

function env(name) {
  return String(process.env[name] || '').trim();
}

async function requestJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'risck-comply-enterprise-final-authority',
    },
  });
  if (!response.ok) throw new Error(`github_api_${response.status}:${new URL(url).pathname}`);
  return response.json();
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function producerSources(spec) {
  return [
    {
      workflow: spec.workflow,
      workflowPath: spec.workflowPath,
      allowedEvents: spec.allowedEvents,
    },
    ...(spec.alternativeSources || []),
  ];
}

function validateRun(run, source, targetSha) {
  return run?.head_sha === targetSha
    && run?.head_branch === 'main'
    && run?.conclusion === 'success'
    && run?.status === 'completed'
    && run?.path === source.workflowPath
    && source.allowedEvents.includes(run?.event);
}

export function validateAuthoritativeEvidenceDocument(spec, document) {
  const expected = spec?.evidenceContract;
  const failures = [];
  if (!expected || typeof expected !== 'object') failures.push('missing_contract');
  if (!document || typeof document !== 'object' || Array.isArray(document)) failures.push('invalid_document');

  if (failures.length === 0) {
    for (const field of ['schema', 'evidenceItem', 'status', 'outcome', 'decision']) {
      if (Object.hasOwn(expected, field) && document?.[field] !== expected[field]) {
        failures.push(`${field}_mismatch`);
      }
    }

    for (const field of expected.emptyArrayFields || []) {
      if (!Array.isArray(document?.[field]) || document[field].length !== 0) {
        failures.push(`${field}_not_empty`);
      }
    }
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

async function downloadValidatedArtifact({ repository, runId, artifactName, destination, token }) {
  if (!Number.isInteger(runId) || runId <= 0) throw new Error('invalid_authoritative_run_id');
  if (!/^[A-Za-z0-9._-]+$/.test(artifactName)) throw new Error('invalid_authoritative_artifact_name');
  await execFile(
    'gh',
    ['run', 'download', String(runId), '--repo', repository, '--name', artifactName, '--dir', destination],
    {
      env: {
        ...process.env,
        GH_TOKEN: token,
      },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
}

async function collectProducer({ spec, repository, targetSha, token, root }) {
  const artifactName = spec.artifact(targetSha);
  let successfulExactShaRunsInspected = 0;

  for (const source of producerSources(spec)) {
    const workflowId = encodeURIComponent(source.workflow);
    const runs = await requestJson(`${API_URL}/repos/${repository}/actions/workflows/${workflowId}/runs?status=completed&head_sha=${targetSha}&per_page=100`, token);
    const candidates = (runs.workflow_runs || []).filter((run) => validateRun(run, source, targetSha));
    successfulExactShaRunsInspected += candidates.length;

    for (const run of candidates) {
      const inventory = await requestJson(`${API_URL}/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`, token);
      if (Number(inventory.total_count || 0) > 100) throw new Error(`${spec.id}:artifact_inventory_truncated`);
      const matches = (inventory.artifacts || []).filter((artifact) => artifact?.expired !== true && artifact?.name === artifactName && Number.isInteger(artifact?.id));
      if (matches.length > 1) throw new Error(`${spec.id}:duplicate_authoritative_artifact`);
      if (matches.length === 0) continue;

      const destination = path.join(root, spec.id);
      await rm(destination, { recursive: true, force: true });
      await mkdir(destination, { recursive: true });
      await downloadValidatedArtifact({
        repository,
        runId: run.id,
        artifactName,
        destination,
        token,
      });

      const files = await walk(destination);
      const evidenceMatches = files.filter((file) => path.basename(file) === spec.evidenceBasename);
      if (evidenceMatches.length !== 1) throw new Error(`${spec.id}:authoritative_evidence_file_count_${evidenceMatches.length}`);
      const document = JSON.parse(await readFile(evidenceMatches[0], 'utf8'));
      const binding = resolveEvidenceShaBinding(document);
      if (binding.conflict || binding.sha !== targetSha) throw new Error(`${spec.id}:evidence_sha_mismatch`);

      const contractValidation = validateAuthoritativeEvidenceDocument(spec, document);
      if (!contractValidation.valid) {
        throw new Error(`${spec.id}:evidence_contract_invalid:${contractValidation.failures.join(',')}`);
      }

      const serialized = JSON.stringify(document);
      if (/(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|postgres(?:ql)?:\/\//i.test(serialized)) {
        throw new Error(`${spec.id}:sensitive_value_detected`);
      }

      return {
        id: spec.id,
        scope: spec.scope === 'external' ? 'external' : 'internal',
        status: 'COLLECTED',
        workflow: source.workflowPath,
        runId: run.id,
        event: run.event,
        artifactId: matches[0].id,
        artifactName,
        evidenceFile: path.relative(root, evidenceMatches[0]).split(path.sep).join('/'),
        shaSource: binding.source,
        evidenceContractValidated: true,
      };
    }
  }

  return {
    id: spec.id,
    scope: spec.scope === 'external' ? 'external' : 'internal',
    status: 'MISSING',
    workflow: spec.workflowPath,
    alternativeWorkflows: (spec.alternativeSources || []).map((source) => source.workflowPath),
    artifactName,
    evidenceFile: null,
    exactShaCompletedSuccessfulRunsInspected: successfulExactShaRunsInspected,
  };
}

export async function collectFinalAuthorityEvidence({ repository, targetSha, token, root, collectProducerImpl = collectProducer } = {}) {
  if (!/^[^/]+\/[^/]+$/.test(repository || '')) throw new Error('repository must use owner/name');
  if (!FULL_SHA.test(targetSha || '')) throw new Error('TARGET_SHA must be a lowercase full commit SHA');
  if (!token) throw new Error('GITHUB_TOKEN is required');

  await mkdir(root, { recursive: true });
  const producers = [];
  for (const spec of FINAL_AUTHORITY_PRODUCERS) {
    try {
      producers.push(await collectProducerImpl({ spec, repository, targetSha, token, root }));
    } catch (error) {
      if (spec.scope !== 'external') throw error;
      producers.push({
        id: spec.id,
        scope: 'external',
        status: 'ERROR',
        workflow: spec.workflowPath,
        alternativeWorkflows: (spec.alternativeSources || []).map((source) => source.workflowPath),
        artifactName: spec.artifact(targetSha),
        evidenceFile: null,
        errorCode: 'external_producer_collection_error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const missing = producers.filter((producer) => producer.status !== 'COLLECTED');
  const internalProducers = producers.filter((producer) => producer.scope !== 'external');
  const externalProducers = producers.filter((producer) => producer.scope === 'external');
  const internalMissing = internalProducers.filter((producer) => producer.status !== 'COLLECTED');
  const externalMissing = externalProducers.filter((producer) => producer.status !== 'COLLECTED');
  const manifest = {
    schema: 'risck-comply.enterprise-final-authority-source.v1',
    generatedAt: new Date().toISOString(),
    targetSha,
    repository,
    status: missing.length === 0 ? 'Complete' : 'Open',
    outcome: missing.length === 0 ? 'passed' : 'blocked',
    requiredProducerCount: FINAL_AUTHORITY_PRODUCERS.length,
    collectedProducerCount: producers.length - missing.length,
    missingProducerIds: missing.map((producer) => producer.id),
    internalStatus: internalMissing.length === 0 ? 'Complete' : 'Open',
    internalOutcome: internalMissing.length === 0 ? 'passed' : 'blocked',
    internalRequiredProducerCount: internalProducers.length,
    internalCollectedProducerCount: internalProducers.length - internalMissing.length,
    internalMissingProducerIds: internalMissing.map((producer) => producer.id),
    externalStatus: externalMissing.length === 0 ? 'Complete' : 'Open',
    externalOutcome: externalMissing.length === 0 ? 'passed' : 'blocked',
    externalRequiredProducerCount: externalProducers.length,
    externalCollectedProducerCount: externalProducers.length - externalMissing.length,
    externalMissingProducerIds: externalMissing.map((producer) => producer.id),
    producers,
    evidenceIntegrity: {
      exactShaRequired: true,
      exactWorkflowPathRequired: true,
      exactArtifactNameRequired: true,
      producerEvidenceContractRequired: true,
      arbitraryRunIdsAccepted: false,
      firstJsonWinsAccepted: false,
      blockedEvidenceAcceptedFromSuccessfulRun: false,
      sensitiveValuesAccepted: false,
      externalProducerErrorsCanGrantStrictPass: false,
      externalProducerErrorsAbortInternalEvaluation: false,
    },
  };
  await writeFile(path.join(root, 'enterprise-final-authority-source.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const root = env('FINAL_AUTHORITY_SOURCE_ROOT') || 'artifacts/enterprise-final-authority-source';
  const manifest = await collectFinalAuthorityEvidence({
    repository: env('GITHUB_REPOSITORY'),
    targetSha: env('TARGET_SHA').toLowerCase(),
    token: env('GITHUB_TOKEN'),
    root,
  });
  console.log(JSON.stringify({
    status: manifest.status,
    targetSha: manifest.targetSha,
    collected: manifest.collectedProducerCount,
    required: manifest.requiredProducerCount,
    missing: manifest.missingProducerIds,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
