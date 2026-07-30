#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const RUN_ID = /^[1-9][0-9]*$/;
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const CANONICAL_PATH = 'docs/security/evidence/runtime/legal-rules-validation.json';
const EXPECTED_SCHEMA = 'risck-comply.legal-rules-runtime-evidence.v1';
const REDACTION_CONFIRMATION = 'Redaction confirmed for runtime evidence.';
const MAX_EVIDENCE_BYTES = 100_000;

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function encodeRepositoryPath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function validateDeploymentOrigin(value) {
  const url = new URL(String(value || ''));
  const host = url.hostname.toLowerCase();
  const allowedHost = host === 'risckcomply.com'
    || host === 'www.risckcomply.com'
    || host.endsWith('.vercel.app');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !allowedHost) {
    throw new Error('runtime evidence deployment origin is outside the approved HTTPS boundary');
  }
  if (url.origin !== value) throw new Error('runtime evidence deployment URL must be a canonical origin');
  return url.origin;
}

function parseEvidence(raw, assessedSha) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_EVIDENCE_BYTES) throw new Error('runtime evidence exceeds maximum accepted size');
  const evidence = JSON.parse(raw);
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new Error('runtime evidence must be an object');
  if (evidence.evidenceItem !== 'legal-rules-validation') throw new Error('unexpected evidence item');
  if (evidence.schema !== EXPECTED_SCHEMA) throw new Error('unexpected evidence schema');
  if (evidence.repository !== REPOSITORY) throw new Error('unexpected evidence repository binding');
  if (evidence.status !== 'PASS') throw new Error('promotion requires PASS runtime evidence');
  if (evidence.deploymentSha !== assessedSha) throw new Error('runtime evidence SHA does not match assessed main');
  if (evidence.countsForRuntimeCoverage !== true) throw new Error('runtime evidence must count for runtime coverage');
  if (evidence.redactionConfirmation !== REDACTION_CONFIRMATION) throw new Error('runtime evidence redaction confirmation is missing');
  if (evidence.environment === 'unknown' || typeof evidence.environment !== 'string') throw new Error('runtime evidence environment is missing');
  validateDeploymentOrigin(evidence.deploymentUrl);
  if (!Array.isArray(evidence.testCases) || evidence.testCases.length < 8 || evidence.testCases.some((item) => item?.status !== 'PASS')) {
    throw new Error('runtime evidence test cases are incomplete or non-PASS');
  }
  if (!Array.isArray(evidence.requestIds) || evidence.requestIds.length === 0
    || evidence.requestIds.some((value) => !/^[A-Za-z0-9._:-]{8,128}$/.test(String(value)))) {
    throw new Error('runtime evidence request IDs are missing or unsanitized');
  }
  if (evidence.evidenceIntegrity?.placeholderOnly !== false) throw new Error('runtime evidence cannot be a placeholder');
  if (evidence.evidenceIntegrity?.runtimeProofInvented !== false) throw new Error('runtime evidence must confirm proof was not invented');
  if (evidence.evidenceIntegrity?.customerFacingProof !== false) throw new Error('runtime evidence cannot be customer-facing proof');
  if (evidence.evidenceIntegrity?.containsSensitiveValues !== false) throw new Error('runtime evidence must confirm sensitive values are absent');
  if (!SHA256.test(String(evidence.artifactSha256 || ''))) throw new Error('runtime evidence artifact digest is malformed');
  const { artifactSha256, ...withoutArtifactDigest } = evidence;
  if (artifactSha256 !== digest(withoutArtifactDigest)) throw new Error('runtime evidence artifact digest mismatch');
  const lower = raw.toLowerCase();
  for (const forbidden of ['authorization', 'set-cookie', 'service_role', 'stripe_secret', 'password=']) {
    if (lower.includes(forbidden)) throw new Error(`runtime evidence contains forbidden material: ${forbidden}`);
  }
  return evidence;
}

function decodeContentFile(response, label) {
  if (!response || Array.isArray(response) || response.type !== 'file' || typeof response.content !== 'string' || typeof response.sha !== 'string') {
    throw new Error(`${label} is not a valid repository file`);
  }
  return {
    blobSha: response.sha,
    raw: Buffer.from(response.content.replace(/\n/g, ''), 'base64').toString('utf8'),
  };
}

async function main() {
  const token = required('GITHUB_TOKEN');
  const repository = required('GITHUB_REPOSITORY');
  const assessedSha = required('ASSESSED_SHA').toLowerCase();
  const sourceRunId = required('SOURCE_RUN_ID');
  const evidencePath = required('EVIDENCE_PATH');
  const canonicalPath = required('CANONICAL_PATH');

  if (repository !== REPOSITORY) throw new Error('promotion repository is not approved');
  if (canonicalPath !== CANONICAL_PATH) throw new Error('promotion canonical path is not approved');
  if (!FULL_SHA.test(assessedSha)) throw new Error('ASSESSED_SHA must be a full lowercase SHA');
  if (!RUN_ID.test(sourceRunId)) throw new Error('SOURCE_RUN_ID must be a positive integer');

  const evidenceRaw = readFileSync(evidencePath, 'utf8');
  const evidence = parseEvidence(evidenceRaw, assessedSha);
  const [owner, repo] = repository.split('/');
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  async function api(path, { method = 'GET', body, allow404 = false } = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      method,
      redirect: 'error',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'risck-comply-legal-rules-runtime-promotion/1.0',
        'x-github-api-version': '2022-11-28',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed with HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }

  const mainCommit = await api('/commits/main');
  if (mainCommit?.sha !== assessedSha) throw new Error('assessed SHA is no longer current main');

  const encodedCanonicalPath = encodeRepositoryPath(canonicalPath);
  const mainFile = decodeContentFile(
    await api(`/contents/${encodedCanonicalPath}?ref=${assessedSha}`),
    'canonical legal-rules evidence',
  );
  const currentEvidence = JSON.parse(mainFile.raw);
  if (!['NOT_EXECUTED', 'PASS'].includes(currentEvidence.status)) {
    throw new Error('canonical legal-rules evidence has an unsupported status');
  }
  if (currentEvidence.status === 'PASS' && currentEvidence.deploymentSha === assessedSha) {
    if (currentEvidence.artifactSha256 !== evidence.artifactSha256) {
      throw new Error('current main already contains conflicting PASS evidence for the assessed SHA');
    }
    process.stdout.write(`${JSON.stringify({
      status: 'ALREADY_PROMOTED',
      assessedSha,
      sourceRunId,
      branch: null,
      pullRequestNumber: null,
      pullRequestUrl: null,
      artifactSha256: evidence.artifactSha256,
      canonicalPath,
    }, null, 2)}\n`);
    return;
  }

  const branch = `automation/legal-rules-runtime-${assessedSha.slice(0, 12)}-${sourceRunId}`;
  const encodedRef = encodeRepositoryPath(`heads/${branch}`);
  let branchRef = await api(`/git/ref/${encodedRef}`, { allow404: true });
  if (!branchRef) {
    branchRef = await api('/git/refs', {
      method: 'POST',
      body: { ref: `refs/heads/${branch}`, sha: assessedSha },
    });
  }

  const branchFile = decodeContentFile(
    await api(`/contents/${encodedCanonicalPath}?ref=${encodeURIComponent(branch)}`),
    'promotion branch legal-rules evidence',
  );

  const normalizedNewEvidence = `${JSON.stringify(evidence, null, 2)}\n`;
  const branchAlreadyUpdated = branchFile.raw === normalizedNewEvidence;
  if (!branchAlreadyUpdated && branchRef?.object?.sha !== assessedSha) {
    throw new Error('existing promotion branch diverged from the assessed main SHA');
  }

  let promotionCommitSha = branchRef?.object?.sha || assessedSha;
  if (!branchAlreadyUpdated) {
    const update = await api(`/contents/${encodedCanonicalPath}`, {
      method: 'PUT',
      body: {
        message: `chore(compliance): promote legal rules runtime evidence ${assessedSha.slice(0, 12)}`,
        content: Buffer.from(normalizedNewEvidence, 'utf8').toString('base64'),
        branch,
        sha: branchFile.blobSha,
      },
    });
    promotionCommitSha = update?.commit?.sha;
    if (!FULL_SHA.test(String(promotionCommitSha || ''))) throw new Error('promotion commit SHA is missing or malformed');
  }

  const headQuery = encodeURIComponent(`${owner}:${branch}`);
  const existingPulls = await api(`/pulls?state=open&base=main&head=${headQuery}&per_page=10`);
  let pull = Array.isArray(existingPulls) ? existingPulls[0] : null;
  let status = branchAlreadyUpdated ? 'REUSED_DRAFT_PR' : 'CREATED_DRAFT_PR';

  if (!pull) {
    pull = await api('/pulls', {
      method: 'POST',
      body: {
        title: `Promote legal-rules runtime evidence for ${assessedSha.slice(0, 12)}`,
        head: branch,
        base: 'main',
        draft: true,
        maintainer_can_modify: false,
        body: [
          '## Objective',
          '',
          'Promote the authenticated legal-rules runtime artifact produced for the exact current `main` deployment.',
          '',
          '## Provenance',
          '',
          `- assessed SHA: \`${assessedSha}\`;`,
          `- source workflow run: \`${sourceRunId}\`;`,
          `- deployment origin: \`${evidence.deploymentUrl}\`;`,
          `- artifact SHA-256: \`${evidence.artifactSha256}\`;`,
          `- canonical path: \`${canonicalPath}\`.`,
          '',
          '## Trust boundary',
          '',
          '- The source workflow completed successfully from a trusted current-main deployment event.',
          '- The artifact was downloaded by exact run ID and exact artifact name.',
          '- Repository binding, deployment SHA, PASS cases, redaction declarations and integrity digest were revalidated.',
          '- This PR changes only the canonical legal-rules evidence document.',
          '- Final review and merge remain human-controlled.',
          '',
          '## Evidence boundary',
          '',
          'This artifact proves deployed behavior for the versioned legal-rules engine. It does not prove legal compliance, customer-specific applicability, regulator acceptance, completed qualified legal review or full production readiness.',
        ].join('\n'),
      },
    });
    status = 'CREATED_DRAFT_PR';
  }

  if (!Number.isInteger(pull?.number) || typeof pull?.html_url !== 'string') {
    throw new Error('promotion pull request metadata is missing');
  }

  process.stdout.write(`${JSON.stringify({
    status,
    assessedSha,
    sourceRunId,
    branch,
    promotionCommitSha,
    pullRequestNumber: pull.number,
    pullRequestUrl: pull.html_url,
    artifactSha256: evidence.artifactSha256,
    canonicalPath,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
