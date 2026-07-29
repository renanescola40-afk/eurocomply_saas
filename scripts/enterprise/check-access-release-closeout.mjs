import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'supabase/migrations/20260726123000_enterprise_privileged_access_governance.sql',
  'supabase/migrations/20260727160000_enterprise_break_glass_governance.sql',
  'src/server/enterprise/privileged-access-governance.ts',
  'src/server/enterprise/break-glass-governance.ts',
  'docs/enterprise/ENTERPRISE_PRIVILEGED_ACCESS_GOVERNANCE.md',
  'docs/enterprise/ENTERPRISE_BREAK_GLASS_GOVERNANCE.md',
  'docs/runbooks/PRIVILEGED_ACCESS_INCIDENT.md',
  'docs/runbooks/ENTERPRISE_BREAK_GLASS_INCIDENT_RUNBOOK.md',
];

const requiredMarkers = new Map([
  ['supabase/migrations/20260726123000_enterprise_privileged_access_governance.sql', ['FOR UPDATE SKIP LOCKED', 'FORCE ROW LEVEL SECURITY', 'approve_enterprise_privileged_access']],
  ['supabase/migrations/20260727160000_enterprise_break_glass_governance.sql', ['FOR UPDATE SKIP LOCKED', 'FORCE ROW LEVEL SECURITY', 'sha256']],
  ['src/server/enterprise/privileged-access-governance.ts', ['createPrivilegedAccessRequest', 'expirePrivilegedAccessRequests']],
  ['src/server/enterprise/break-glass-governance.ts', ['createBreakGlassRequest', 'expireBreakGlassRequests']],
]);

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`missing required closeout file: ${file}`);
}
for (const [file, markers] of requiredMarkers) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file}: missing invariant marker ${marker}`);
  }
}

console.log('Enterprise access and release closeout gate');
console.log('-------------------------------------------');
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS: ${requiredFiles.length} required artifacts and all security invariants are present.`);
