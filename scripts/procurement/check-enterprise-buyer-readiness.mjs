#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const required = new Map([
  ['docs/sales/ENTERPRISE_BUYER_READINESS_2026-09-24.md', ['ENTERPRISE_BUYER_READINESS_INTERNAL=PASS', 'Essential €49', 'Enterprise from €990/month']],
  ['docs/sales/enterprise-onboarding-plan.md', ['Phase 1 — Kickoff and success criteria', 'Security Questionnaire', 'fixed implementation timeline']],
  ['docs/sales/demo-script-10-min.md', ['synthetic demo', 'config/billing-commercial-catalog.json']],
  ['docs/sales/pitch-deck-short.md', ['Enterprise from €990/month', 'No free trial']],
  ['docs/sales/one-pager.md', ['Enterprise Product One-Pager', 'Security Questionnaire', 'Enterprise — from €990/month']],
  ['docs/sales/commercial-faq.md', ['Enterprise — from €990/month', 'eu-west-1 (Ireland)', '2026']],
  ['docs/trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md', ['flowchart TB', 'Supabase Auth', 'Forced RLS', 'signed webhooks']],
  ['docs/trust/ARCHITECTURE_OVERVIEW.md', ['RISCK COMPLY is a localized Next.js application', 'ENTERPRISE_ARCHITECTURE_DIAGRAM.md']],
  ['docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md', ['BUYER_DILIGENCE_INTERNAL_READY', 'Buyer quick-start', 'BUYER_ACCEPTANCE=EXTERNAL']],
  ['config/billing-commercial-catalog.json', ['"monthlyPriceCents": 4900', '"monthlyPriceCents": 14900', '"monthlyPriceCents": 39900', '"startingMonthlyPriceCents": 99000']],
]);

const stale = [
  'A third-party penetration test has not yet been completed',
  'A third-party penetration test has not completed',
  'EuroComply is a localized Next.js application',
  '- Enterprise — custom',
];

const failures = [];
for (const [path, tokens] of required) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing`);
    continue;
  }
  const content = readFileSync(path, 'utf8');
  for (const token of tokens) if (!content.includes(token)) failures.push(`${path}: missing token "${token}"`);
}

for (const path of [
  'docs/sales/README.md',
  'docs/sales/demo-script-10-min.md',
  'docs/sales/pitch-deck-short.md',
  'docs/sales/one-pager.md',
  'docs/sales/commercial-faq.md',
  'docs/trust/ARCHITECTURE_OVERVIEW.md',
  'docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md',
]) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf8');
  for (const phrase of stale) if (content.includes(phrase)) failures.push(`${path}: stale buyer statement "${phrase}"`);
}

if (failures.length) {
  console.error('Enterprise buyer readiness check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Enterprise buyer readiness check passed.');
