#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SHA40 = /^[0-9a-f]{40}$/;

export function buildGatePacket(scope, grouping, {gateId, headSha} = {}) {
  if (!SHA40.test(headSha || '')) throw Error('exact_head_sha_required');
  if (!Array.isArray(scope?.mandatory) || scope.mandatory.length !== 38 ||
      !Array.isArray(grouping?.groups) || grouping.groups.length !== 24 ||
      grouping.scoringContract?.PRODUCT_READY_DENOMINATOR !== 24 ||
      grouping.scoringContract?.ATOMIC_REQUIRED_SOURCE_CHECKS !== 38) {
    throw Error('canonical_24_38_scope_required');
  }
  const ids = scope.mandatory.map(control => control.id);
  const gateIds = grouping.groups.map(g => g.id);
  if (new Set(ids).size !== 38) throw Error('duplicate_atomic_ids');
  if (new Set(gateIds).size !== 24) throw Error('duplicate_gate_ids');
  if (typeof gateId !== 'string' || !/^A-(0[1-9]|1[0-9]|2[0-4])$/.test(gateId)) throw Error('gate_id_required');
  const gate = grouping.groups.find(g => g.id === gateId);
  if (!gate) throw Error('gate_not_found');
  if (!Array.isArray(gate.atomicCriteria) || !gate.atomicCriteria.length) throw Error('gate_has_no_controls');
  const controls = gate.atomicCriteria.map(id => {
    const source = scope.mandatory.find(c => c.id === id);
    if (!source) throw Error('unmapped_atomic_control:' + id);
    return {id: source.id, source_status: source.status, dependencies: source.dependencies || [],
      required_evidence: source.evidenceRequired, criterion: source.criterion};
  });
  const missing = controls.find(c => c.source_status === 'BLOCKED') ||
                  controls.find(c => c.source_status !== 'PASS');
  return {
    schema: 'risck-comply.enterprise-gate-execution-packet.v1',
    repository: 'renanescola40-afk/eurocomply_saas',
    checkout_head_sha: headSha,
    gate_id: gate.id,
    gate_label: gate.label,
    scope_gate_total: 24, scope_atomic_total: 38,
    authority: 'ADVISORY_SOURCE_ONLY_NOT_GATE_ACCEPTANCE',
    source_registry_date: scope.dated || null,
    source_freshness: 'UNVERIFIED_UNTIL_CURRENT_PROVIDER_READBACK',
    controls,
    next_action: missing
      ? {type: 'PROVE_ATOMIC_CONTROL', control_id: missing.id, evidence: missing.required_evidence,
         dependencies: missing.dependencies}
      : {type: 'VERIFY_CURRENT_PROVIDER_AND_QUALIFIED_REVIEW', control_id: null},
    official_validator: 'node scripts/enterprise-evidence/validate-evidence.mjs --report',
    acceptance_rule: 'ONLY_PROVIDER_BACKED_OFFICIAL_POST_REVIEW_ACCEPTANCE',
    caveat: 'No merge, source status or local test can constitute formal acceptance.'
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--gate') throw Error('usage: node scripts/agents/enterprise-gate-packet.mjs --gate A-18');
  const read = file => JSON.parse(fs.readFileSync(path.join(process.cwd(), file), 'utf8'));
  const headSha = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {encoding:'utf8', timeout:5000}).trim();
  console.log(JSON.stringify(buildGatePacket(
    read('config/g1-enterprise-scope-v1.json'),
    read('config/g1-product-ready-24-gates.json'),
    {gateId: args[1], headSha}
  ), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { main(); } catch (error) { console.error(String(error.message || error)); process.exitCode = 1; }
}
