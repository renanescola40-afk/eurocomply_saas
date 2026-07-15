import { existsSync, readFileSync } from 'node:fs';

const auditLogPath = 'src/lib/security/audit-log.ts';
const serverActionAuditPath = 'src/server/actions/audit.ts';

const criticalSourceFiles = [
  'src/server/security/auth-audit.ts',
  'src/server/security/rbac.ts',
  'src/server/security/step-up.ts',
  'src/app/api/billing/checkout/route.ts',
  'src/app/api/billing/portal/route.ts',
  'src/app/api/billing/webhook/route.ts',
  'src/server/billing/stripe-webhooks.ts',
  'src/server/actions/compliance-tasks.ts',
  'src/server/actions/document-downloads.ts',
  'src/server/actions/documents.ts',
  'src/server/actions/members.ts',
  'src/server/actions/risks.ts',
  'src/server/actions/vendors.ts',
  'src/app/api/audit/chain/verify/route.ts',
  'src/app/api/audit/evidence-pack/route.ts',
  'src/app/api/reports/documents.csv/route.ts',
  'src/app/api/reports/executive.csv/route.ts',
  'src/app/api/reports/risks.csv/route.ts',
  'src/app/api/reports/tasks.csv/route.ts',
  'src/app/api/reports/vendors.csv/route.ts',
];

const auditEvidenceFiles = [
  'docs/security/AUDIT_CHAIN_MODEL.md',
  'docs/security/evidence/runtime/audit-chain-live-validation.json',
];

const forbiddenLegacyFiles = ['src/server/actions/billing.ts'];

const requiredCriticalActions = [
  'auth.login_attempt',
  'auth.login_success',
  'auth.login_failure',
  'auth.logout',
  'auth.oauth_start',
  'auth.oauth_callback',
  'auth.step_up_requested',
  'auth.step_up_approved',
  'auth.step_up_denied',
  'auth.step_up_expired',
  "securityEvent: 'rbac.denied'",
  'checkout_created',
  'billing_portal_created',
  'webhook_received',
  'webhook_rejected',
  'billing.subscription_updated',
  'document.upload',
  'document.download',
  'document.update',
  'document.delete',
  'document.approval_changed',
  'export.created',
  'report.export',
  'audit_chain.evidence_exported',
  'gdpr.export',
  'gdpr.delete_requested',
  'team.invite_created',
  'team.invite_cancelled',
  'team.member_removed',
  'team.member_role_changed',
  'permission.changed',
  'risk.create',
  'risk.update',
  'risk.delete',
  'vendor.create',
  'vendor.update',
  'vendor.delete',
  'task.create',
  'task.update',
  'task.delete',
  'security.settings_changed',
  'security.event',
  'security.failure',
];

const requiredCoverageFamilies = [
  'auth',
  'rbacDenied',
  'stepUp',
  'billing',
  'webhookFailures',
  'uploads',
  'downloads',
  'exports',
  'teamChanges',
  'documentChanges',
  'risksVendorsTasks',
  'gdpr',
  'securitySettings',
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

for (const path of forbiddenLegacyFiles) {
  if (existsSync(path)) failures.push(`${path} must remain removed; billing mutations must use API routes`);
}

const auditLog = read(auditLogPath);
const serverActionAudit = read(serverActionAuditPath);
const productionAuditSources = [auditLog, serverActionAudit, ...criticalSourceFiles.map(read)].join('\n');
const auditEvidence = auditEvidenceFiles.map(read).join('\n');

if (auditLog) {
  requireToken(auditLogPath, auditLog, 'actor_user_id');
  requireToken(auditLogPath, auditLog, 'legacyPersisted');
  requireToken(auditLogPath, auditLog, 'createAuditEvent');
  requireToken(auditLogPath, auditLog, 'requestContext');

  const legacyAuditLogColumnWrite = /\baudit_logs['"]\)\.insert\(\{[\s\S]*?\buser_id\s*:\s*actorUserId/.test(auditLog);
  if (legacyAuditLogColumnWrite) failures.push(`${auditLogPath} must write actor_user_id, not user_id, to audit_logs`);
  if (auditLog.includes('ip_address: ip')) failures.push(`${auditLogPath} must keep IP address in sanitized metadata unless the audit_logs schema has an ip_address column`);
  if (auditLog.includes('user_agent: userAgent')) failures.push(`${auditLogPath} must keep user agent in sanitized metadata unless the audit_logs schema has a user_agent column`);
}

if (serverActionAudit) {
  requireToken(serverActionAuditPath, serverActionAudit, 'writeAuditLog');
}

for (const action of requiredCriticalActions) {
  requireToken('production audit action sources', productionAuditSources, action);
}

for (const family of requiredCoverageFamilies) {
  requireToken('critical audit coverage evidence', auditEvidence, family);
}

if (failures.length > 0) {
  console.error('Audit critical coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit critical coverage: ok');
}
