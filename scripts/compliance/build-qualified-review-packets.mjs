#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

export function buildReviewPackets({ registry, targetSha, repository = REPOSITORY, generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(targetSha)) throw new Error('targetSha must be a full lowercase Git SHA');
  if (repository !== REPOSITORY) throw new Error('unexpected repository');
  return registry.requirements.map((requirement) => {
    const body = {
      schema: 'risck-comply.qualified-review-packet.v1',
      repository,
      targetSha,
      generatedAt,
      requirementId: requirement.id,
      weight: requirement.weight,
      acceptedPath: requirement.acceptedPath,
      questions: requirement.questions,
      truthBoundary: [
        'Reviewer acceptance is not certification or regulator approval.',
        'The reviewer must disclose qualifications, scope and conflicts.',
        'Any FAIL finding keeps the requirement blocked.'
      ]
    };
    return { ...body, integrity: { sha256: crypto.createHash('sha256').update(JSON.stringify(stable(body))).digest('hex') } };
  });
}

function main() {
  const registry = JSON.parse(fs.readFileSync('docs/compliance/evidence/qualified-review-execution-registry.json', 'utf8'));
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const outputRoot = path.resolve(process.env.REVIEW_PACKET_ROOT || 'artifacts/qualified-review-packets');
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const packet of buildReviewPackets({ registry, targetSha })) {
    fs.writeFileSync(path.join(outputRoot, `${packet.requirementId}.json`), `${JSON.stringify(packet, null, 2)}\n`, { mode: 0o600 });
  }
  console.log(JSON.stringify({ generated: registry.requirements.length, targetSha, outputRoot }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
