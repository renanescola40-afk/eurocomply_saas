#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'supabase', 'migrations');
const centralReplay = join(process.cwd(), 'scripts', 'recovery', 'run-ephemeral-project-schema-replay.mjs');
const blocked = [
  '20260721123000_gpai_third_party_model_governance.sql',
  '20260721133000_post_market_ai_incident_governance.sql',
];
const integration = '20260721113000_enterprise_integrations_platform.sql';
const relations = '20260721114500_enterprise_integrations_tenant_relations.sql';
const licensing = '20260721193000_enterprise_tenant_licensing_core.sql';
const fria = '20260721143000_fria_fundamental_rights_governance.sql';
const friaIndex = 'create unique index if not exists ai_fria_assessments_org_id_id on public.ai_fria_assessments(organization_id,id);';
const friaMarker = 'create table if not exists public.ai_fria_evidence (';

const p = (name) => join(dir, name);
const fail = (message) => { throw new Error(message); };
const mustExist = (file) => { if (!existsSync(file)) fail(`Missing reviewed replay prerequisite: ${file}`); };
const markdown = (value) => '`' + value + '`';

function validate() {
  if (process.env.GITHUB_ACTIONS !== 'true') fail('Reviewed replay is restricted to GitHub Actions');
  const batchF = readFileSync('docs/security/decisions/2026-08-10-supabase-human-review-mega-batch-f.md', 'utf8');
  const integrationReview = readFileSync('docs/security/evidence/human-review/supabase-migration-mega-batch-j.md', 'utf8');
  const relationsReview = readFileSync('docs/security/evidence/human-review/supabase-migration-mega-batch-h.md', 'utf8');
  const licensingReview = readFileSync('docs/security/evidence/human-review/supabase-migration-mega-batch-g.md', 'utf8');
  for (const name of [...blocked, integration, relations, licensing, fria]) mustExist(p(name));
  for (const name of blocked) if (!batchF.includes(markdown(name)) || !batchF.includes('PENDING_DEPLOYMENT')) fail(`Unreviewed prerequisite boundary: ${name}`);
  if (!batchF.includes('F7 — ' + markdown(fria))) fail('FRIA review boundary drifted');
  if (!integrationReview.includes(markdown(integration)) || !integrationReview.includes('J9 → H10')) fail('Integration review boundary drifted');
  if (!relationsReview.includes(markdown(relations))) fail('Relations review boundary drifted');
  if (!licensingReview.includes(markdown(licensing))) fail('Licensing review boundary drifted');
  if (!readFileSync(p(integration), 'utf8').includes("coalesce(om.status, 'active') = 'active'")) fail('Integration status dependency drifted');
  if (!readFileSync(p(licensing), 'utf8').includes("add column if not exists status text not null default 'active'")) fail('Licensing status foundation drifted');
}

function main() {
  validate();
  const blockedHeld = blocked.map((name) => [p(name), p(name + '.reviewed-hold')]);
  const integrationHeld = p(integration + '.reviewed-hold');
  const relationsHeld = p(relations + '.reviewed-hold');
  const integrationReplay = p('20260721193001_enterprise_integrations_platform.sql');
  const relationsReplay = p('20260721193002_enterprise_integrations_tenant_relations.sql');
  const friaHeld = p(fria + '.reviewed-hold');
  const staged = [];

  try {
    for (const [source, held] of blockedHeld) { renameSync(source, held); staged.push([source, held]); }

    const friaSql = readFileSync(p(fria), 'utf8');
    const indexAt = friaSql.indexOf(friaIndex);
    const markerAt = friaSql.indexOf(friaMarker);
    if (indexAt < 0 || markerAt < 0 || indexAt < markerAt) fail('FRIA canonical statement order drifted');
    renameSync(p(fria), friaHeld); staged.push([p(fria), friaHeld]);
    const withoutIndex = friaSql.replace(friaIndex + '\n', '');
    const replayMarkerAt = withoutIndex.indexOf(friaMarker);
    writeFileSync(p(fria), withoutIndex.slice(0, replayMarkerAt) + friaIndex + '\n' + withoutIndex.slice(replayMarkerAt), 'utf8');

    renameSync(p(integration), integrationHeld); staged.push([p(integration), integrationHeld]);
    renameSync(p(relations), relationsHeld); staged.push([p(relations), relationsHeld]);
    copyFileSync(integrationHeld, integrationReplay);
    copyFileSync(relationsHeld, relationsReplay);
    if (!readFileSync(integrationHeld).equals(readFileSync(integrationReplay))) fail('Integration replay bytes changed');
    if (!readFileSync(relationsHeld).equals(readFileSync(relationsReplay))) fail('Relations replay bytes changed');

    execFileSync(process.execPath, [centralReplay], { stdio: 'inherit', env: process.env });
  } finally {
    if (existsSync(integrationReplay)) renameSync(integrationReplay, integrationReplay + '.discarded');
    if (existsSync(relationsReplay)) renameSync(relationsReplay, relationsReplay + '.discarded');
    if (existsSync(p(fria)) && existsSync(friaHeld)) renameSync(p(fria), p(fria + '.disposable'));
    for (const [source, held] of [...staged].reverse()) if (existsSync(held) && !existsSync(source)) renameSync(held, source);
  }

  process.stdout.write('Reviewed disposable replay completed; canonical migration files restored.\n');
}

try { main(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
