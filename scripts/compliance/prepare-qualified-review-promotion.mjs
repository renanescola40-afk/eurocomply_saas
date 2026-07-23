#!/usr/bin/env node
import fs from 'node:fs';
import { evaluateSignoffs } from './validate-qualified-review-signoffs.mjs';

const registry = JSON.parse(fs.readFileSync('docs/compliance/evidence/qualified-review-execution-registry.json','utf8'));
const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const report = evaluateSignoffs({ registry, targetSha });
const operations = report.results.filter((item) => item.state === 'accepted').map((item) => {
  const requirement = registry.requirements.find((entry) => entry.id === item.id);
  return {
    requirementId: item.id,
    source: `docs/compliance/evidence/staging/${item.id}.signoff.json`,
    destination: requirement.acceptedPath,
    action: 'REVIEWED_COPY_REQUIRED',
  };
});
const plan = {
  schema: 'risck-comply.qualified-review-promotion-plan.v1',
  targetSha,
  generatedAt: new Date().toISOString(),
  mutatesRepository: false,
  acceptedWeight: report.acceptedWeight,
  remainingWeight: report.remainingWeight,
  operations,
  warning: 'This plan never copies or accepts evidence automatically. A maintainer must review each package and create a separate promotion PR.'
};
fs.mkdirSync('artifacts/qualified-review-execution', { recursive: true });
fs.writeFileSync('artifacts/qualified-review-execution/promotion-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
console.log(JSON.stringify(plan, null, 2));
