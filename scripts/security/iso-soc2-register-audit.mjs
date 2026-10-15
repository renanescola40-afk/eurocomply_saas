#!/usr/bin/env node
/** Offline-only evidence register validation. No network, credentials or writes. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/assurance/iso27001-soc2/annex-a-control-register.csv');
const fields = ['control_id', 'domain', 'applicability', 'status', 'evidence_status', 'owner', 'risk_reference', 'notes'];
const groups = [[5, 'Organizational', 37], [6, 'People', 8], [7, 'Physical', 14], [8, 'Technological', 34]];

export function parseCsv(input) {
  const rows = [];
  let cell = '', row = [], quoted = false;
  const pushRow = () => {
    row.push(cell); cell = '';
    if (row.some((v) => v !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && input[i + 1] === '\n') i++;
      pushRow();
    } else cell += c;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  if (cell !== '' || row.length) pushRow();
  return rows;
}

export function auditRegister(content) {
  const csv = parseCsv(content);
  if (!csv.length || csv[0].join(',') !== fields.join(',')) throw new Error('Unexpected register header/schema');
  const rows = csv.slice(1);
  const byId = new Map();
  for (const [index, cells] of rows.entries()) {
    if (cells.length !== fields.length) throw new Error('Row ' + (index + 2) + ': wrong column count');
    const record = Object.fromEntries(fields.map((name, i) => [name, cells[i].trim()]));
    const id = record.control_id;
    if (byId.has(id)) throw new Error('Duplicate control: ' + id);
    if (!record.applicability || !record.status || !record.evidence_status || !record.owner) throw new Error('Incomplete required fields: ' + id);
    if (!['NOT_VERIFIED', 'NOT_ASSESSED'].includes(record.evidence_status)) {
      throw new Error('Evidence claim on ' + id + ' cannot be proved by current schema; add immutable evidence pointer, reviewer and timestamp first');
    }
    byId.set(id, record);
  }
  for (const [section, domain, count] of groups) {
    for (let n = 1; n <= count; n++) {
      const id = 'A.' + section + '.' + n;
      const entry = byId.get(id);
      if (!entry) throw new Error('Missing Annex A control: ' + id);
      if (entry.domain !== domain) throw new Error('Incorrect domain for ' + id);
    }
  }
  if (rows.length !== 93) throw new Error('Expected 93 controls, got ' + rows.length);
  return {
    schema: 'iso27001_annex_a_inventory_integrity_v1',
    controls_expected: 93,
    controls_present: rows.length,
    controls_assessed_for_applicability: rows.filter((cells) => cells[2].trim() !== 'NOT_ASSESSED').length,
    independently_verified_evidence_in_this_register: 0,
    inventory_integrity_pass: true,
    iso27001_certification_status: 'NOT_CERTIFIED_BY_THIS_CHECK',
    iso27001_overall_readiness_percentage: null,
    soc2_type_i_readiness_percentage: null,
    soc2_type_ii_readiness_percentage: null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(auditRegister(readFileSync(resolve(process.argv[2] ?? defaultPath), 'utf8')), null, 2));
  } catch (error) {
    console.error('ISO/SOC 2 register integrity FAIL: ' + error.message);
    process.exitCode = 1;
  }
}
