#!/usr/bin/env node
/** Offline status reporter; a repository register is NOT an independent audit opinion. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(import.meta.url);
const defaultRegister = resolve(dirname(source), '../../docs/assurance/iso27001-soc2/closure-gate-register-2026-10-15.md');
const allowed = new Set([
  'NOT_STARTED', 'NOT_VERIFIED', 'NOT_TESTED', 'FAIL',
  'PARTIAL', 'PARTIAL_METADATA', 'PARTIAL_REPOSITORY_EVIDENCE',
  'PASS', 'CLOSED', 'AUDIT_ACCEPTED',
]);

export function summarizeGateRegister(markdown) {
  const gates = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    if (!/^\|\s*G\d{2}\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(v => v.trim());
    if (cells.length !== 4) throw new Error('Expected exactly four gate columns');
    const [id, label, closureRequires, rawStatus] = cells;
    if (!label || !closureRequires) throw new Error('Missing gate description: ' + id);
    if (!allowed.has(rawStatus)) throw new Error('Unexpected gate status: ' + id + ' = ' + rawStatus);
    if (gates.has(id)) throw new Error('Duplicate gate: ' + id);
    gates.set(id, rawStatus);
  }
  for (let i = 1; i <= 11; i++) {
    const id = 'G' + String(i).padStart(2, '0');
    if (!gates.has(id)) throw new Error('Missing required gate: ' + id);
  }
  if (gates.size !== 11) throw new Error('Expected exactly 11 gates');
  const entries = [...gates.entries()];
  const closed = entries.filter(([, status]) => status === 'CLOSED' || status === 'AUDIT_ACCEPTED').length;
  const partial = entries.filter(([, status]) => status.startsWith('PARTIAL')).length;
  const passingButOpen = entries.filter(([, status]) => status === 'PASS').length;
  const remaining = 11 - closed;
  return {
    kind: 'INTERNAL_GATE_REGISTER_PROGRESS_NOT_CERTIFICATION',
    gate_count: 11,
    register_reported_closed: closed,
    register_reported_partial: partial,
    register_reported_pass_but_not_closed: passingButOpen,
    gate_count_remaining_to_close: remaining,
    pct_closed_of_eleven: Math.round((closed / 11) * 10000) / 100,
    pct_remaining_of_eleven: Math.round((remaining / 11) * 10000) / 100,
    gates: Object.fromEntries(entries),
    independently_verified_iso27001_certification: false,
    independently_verified_soc2_report: false,
    caveat: 'Counts only gate statuses in an internal Markdown register, not verified control operation or auditor acceptance. Any closure must still have independent evidence review.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === source) {
  try {
    const file = resolve(process.argv[2] ?? defaultRegister);
    console.log(JSON.stringify(summarizeGateRegister(readFileSync(file, 'utf8')), null, 2));
  } catch (error) {
    console.error('Gate progress validation failed: ' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
