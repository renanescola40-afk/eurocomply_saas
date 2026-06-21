import { existsSync, readFileSync } from 'node:fs';

const auditLogPath = 'src/lib/security/audit-log.ts';
const serverActionAuditPath = 'src/server/actions/audit.ts';

const criticalCoverageFiles = [
  'src/server/actions/billing.ts',
  'src/server/actions/compliance-tasks.ts',
  'src/server/actions/document-downloads.ts',
  'src/server/actions/documents.ts',
  'src/server/actions/members.ts',
  'src/server/actions/risks.ts',
  'src/server/actions/vendors.ts',
];

const requiredCriticalActions = [
  'billing.checkout_start',
  'billing.portal_start',
  'document.upload',
  'document.download',
  'document.delete',
  'team.invite_created',
  'team.invite_cancelled',
  'team.member_removed',
  'risk.create',
  'risk.delete',
  'vendor.create',
  'vendor.delete',
  'task.create',
  'task.update',
  'task.delete',
  'security.failure',
];

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireToken(path, source, token) {
  if (!source.includes(token)) failures.push(`${path} missing audit coverage token: ${token}`);
}

console.log('EuroComply audit critical coverage check');
console.log('-----------------------------------------');

const auditLog = read(auditLogPath);
const serverActionAudit = read(serverActionAuditPath);
const combinedCriticalSources = criticalCoverageFiles.map(read).join('\n');

if (auditLog) {
  requireToken(auditLogPath, auditLog, 'actor_user_id');
  requireToken(auditLogPath, auditLog, 'legacyPersisted');
  requireToken(auditLogPath, auditLog, 'createAuditEvent');
  requireToken(auditLogPath, auditLog, 'requestContext');

  if (auditLog.includes('user_id: actorUserId')) failures.push(`${auditLogPath} must write actor_user_id, not user_id, to audit_logs`);
  if (auditLog.includes('ip_address: ip')) failures.push(`${auditLogPath} must keep IP address in sanitized metadata unless the audit_logs schema has an ip_address column`);
  if (auditLog.includes('user_agent: userAgent')) failures.push(`${auditLogPath} must keep user agent in sanitized metadata unless the audit_logs schema has a user_agent column`);
}

if (serverActionAudit) {
  requireToken(serverActionAuditPath, serverActionAudit, 'writeAuditLog');
}

for (const action of requiredCriticalActions) {
  requireToken('critical audit action sources', combinedCriticalSources, action);
}

if (failures.length > 0) {
  console.error('Audit critical coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit critical coverage: ok');
}
