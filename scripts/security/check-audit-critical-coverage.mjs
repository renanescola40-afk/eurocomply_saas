import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

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
  "securityEvent: 'rbac.denied'",
  'checkout_created',
  'billing_portal_created',
  'webhook_received',
  'webhook_rejected',
  'document.upload',
  'document.download',
  'document.update',
  'document.delete',
  'report.export',
  'audit_chain.evidence_exported',
  'team.invite_cancelled',
  'risk.update',
  'vendor.update',
  'task.create',
  'task.update',
  'task.delete',
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

// These criteria use different event names, metadata, or SQL emitters in the
// current application. Keep the criterion IDs stable for consumers of the check.
export function checkMappedAuditCoverage(readSource) {
  const sources = new Map();
  function source(path) {
    if (!sources.has(path)) {
      const raw = readSource(path);
      sources.set(path, ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true));
    }
    return sources.get(path);
  }

  function hasCall(path, name, matches, scope) {
    const file = source(path);
    if (file.parseDiagnostics.length) return false;

    function visit(node, active = !scope) {
      if (ts.isFunctionLike(node) && node.name) active = node.name.getText(file) === scope || !scope;
      if (active && ts.isCallExpression(node)) {
        const target = node.expression;
        const called = ts.isPropertyAccessExpression(target) ? target.name.getText(file) : target.getText(file);
        if (called === name && matches(node.arguments)) return true;
      }
      return ts.forEachChild(node, child => visit(child, active)) || false;
    }

    return visit(file);
  }

  function property(object, name) {
    if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
    return object.properties.find(item => ts.isPropertyAssignment(item)
      && (item.name.text === name))?.initializer;
  }

  function literal(expression, expected) {
    return !!expression && ts.isStringLiteral(expression) && expression.text === expected;
  }

  function expressionIs(expression, expected) {
    return expression?.getText() === expected;
  }

  function variableInitializer(path, name, scope) {
    const file = source(path);
    const statements = scope
      ? file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === scope)?.body?.statements
      : file.statements;
    function find(nodes) {
      for (const node of nodes ?? []) {
        if (ts.isVariableStatement(node)) {
          const declaration = node.declarationList.declarations.find(item => item.name.getText(file) === name);
          if (declaration) return declaration.initializer;
        }
        if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement)) {
          const initializer = find(node.thenStatement.statements);
          if (initializer) return initializer;
        }
      }
    }
    return find(statements);
  }

  function auditAction(path, action, method = 'POST') {
    return hasCall(path, 'createAuditEvent', ([input]) => literal(property(input, 'action'), action), method);
  }

  function hasIfCondition(path, scope, matches) {
    const file = source(path);
    const declaration = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === scope);
    return declaration?.body?.statements.some(node => ts.isIfStatement(node) && matches(node.expression)) ?? false;
  }

  function compares(expression, reference, value) {
    return ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      && expressionIs(expression.left, reference) && literal(expression.right, value);
  }

  function containsComparison(expression, reference, value) {
    return compares(expression, reference, value) || (ts.isBinaryExpression(expression)
      && expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
      && (containsComparison(expression.left, reference, value) || containsComparison(expression.right, reference, value)));
  }

  function branchValues(expression, first, second) {
    return !!expression && ts.isConditionalExpression(expression)
      && literal(expression.whenTrue, first) && literal(expression.whenFalse, second);
  }

  function sqlFunction(path, name) {
    // Match only the installed function definition, not preflight assertions,
    // comments, grants, other function bodies or superseded migrations.
    const sql = readSource(path).replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '');
    const definition = new RegExp(
      String.raw`create\s+or\s+replace\s+function\s+public\.${name}\s*\([\s\S]*?\bas\s+(\$[a-z_]*\$)([\s\S]*?)\1`,
      'i',
    );
    return sql.match(definition)?.[2] ?? '';
  }

  const stepUp = 'src/server/security/step-up.ts';
  const challenge = 'src/app/api/security/step-up/challenge/route.ts';
  const verify = 'src/app/api/security/step-up/verify/route.ts';
  const stripe = 'src/server/billing/stripe-webhooks.ts';
  const approval = 'src/app/api/documents/[id]/approval/route.ts';
  const membershipSql = 'supabase/migrations/20261018190000_reconcile_audited_membership_usage_counters.sql';
  const auditEvents = 'src/server/queries/audit-events.ts';
  const commercialWriter = 'src/server/billing/commercial-resource-atomic.ts';
  const commercialSql = 'supabase/migrations/20260822120617_atomic_vendor_risk_quota_mutations.sql';
  const groupSql = 'supabase/migrations/20260724093000_enterprise_group_access_admin_controls.sql';

  const stepUpWriter = hasCall(stepUp, 'writeAuditLog', ([input]) =>
    literal(property(input, 'action'), 'security.event')
    && expressionIs(property(property(input, 'metadata'), 'stepUpEvent'), 'input.event'), 'recordStepUpAuditEvent');
  const emitsStepUp = (path, matches) => stepUpWriter
    && hasCall(path, 'recordStepUpAuditEvent', ([input]) => matches(property(input, 'event')), 'POST');

  function membershipAudit(route, wrapper, rpc, event) {
    if (!hasCall(route, wrapper, () => true) ||
      !hasCall(auditEvents, 'rpc', ([name]) => literal(name, rpc), wrapper) ||
      !hasCall(auditEvents, 'normalizeAuditEventInput', ([input]) => literal(property(input, 'action'), event), wrapper) ||
      !hasCall(auditEvents, 'buildChainedPayload', ([input]) => expressionIs(input, 'normalized'), wrapper)) {
      return false;
    }

    const body = sqlFunction(membershipSql, rpc);
    const action = event.replaceAll('.', '\\.');
    const chained = new RegExp(String.raw`\bperform\s+public\.append_audit_event_chained\(\s*p_audit_id,\s*p_organization_id,\s*p_actor_user_id,\s*'${action}'`);
    const legacy = new RegExp(String.raw`\binsert\s+into\s+public\.audit_logs\s*\([^)]*\baction\b[^)]*\)\s*values\s*\(\s*p_organization_id,\s*p_actor_user_id,\s*'${action}'`);
    return chained.test(body) && legacy.test(body);
  }

  const commercialRpc = 'mutate_commercial_resource_with_audit_atomic';
  const commercialBody = sqlFunction(commercialSql, commercialRpc);
  const commercialAudit = table => new RegExp(
    String.raw`\binsert\s+into\s+public\.${table}\s*\([^)]*\baction\b[^)]*\)\s*values\s*\(\s*p_audit_id,\s*p_organization_id,\s*p_actor_user_id,\s*p_resource_type\s*\|\|\s*'\.'\s*\|\|\s*p_operation`,
  ).test(commercialBody);

  const commercialWriterMatches = literal(variableInitializer(commercialWriter, 'ATOMIC_COMMERCIAL_RESOURCE_RPC'), commercialRpc)
    && hasCall(commercialWriter, 'buildAuditChainRecord', ([input]) =>
      expressionIs(property(input, 'action'), `${input.resource}.${input.operation}`), 'mutateCommercialResourceAtomic')
    && hasCall(commercialWriter, 'rpc', ([name, input]) =>
      expressionIs(name, 'ATOMIC_COMMERCIAL_RESOURCE_RPC')
      && expressionIs(property(input, 'p_resource_type'), 'input.resource')
      && expressionIs(property(input, 'p_operation'), 'input.operation')
      && expressionIs(property(input, 'p_event_hash'), 'chain.eventHash')
      && expressionIs(property(input, 'p_hash_signature'), 'chain.signature ?? null'), 'mutateCommercialResourceAtomic')
    && commercialAudit('audit_events') && commercialAudit('audit_logs');

  function commercialAction(resource, operation) {
    const path = resource === 'risk' ? 'src/server/actions/risks.ts' : 'src/server/actions/vendors.ts';
    const scope = operation + (resource === 'risk' ? 'Risk' : 'Vendor');
    const sqlBranch = new RegExp(String.raw`\b(?:if|elsif)\s+p_operation\s*=\s*'${operation}'\s+and\s+p_resource_type\s*=\s*'${resource}'\s+then\b`, 'i');
    return commercialWriterMatches && sqlBranch.test(commercialBody)
      && hasCall(path, 'mutateCommercialResourceAtomic', ([input]) =>
        literal(property(input, 'resource'), resource) && literal(property(input, 'operation'), operation), scope);
  }

  const stripeSuffix = variableInitializer(stripe, 'suffix', 'upsertSubscriptionFromStripe');
  const stripeSuffixMatches = !!stripeSuffix && ts.isConditionalExpression(stripeSuffix)
    && expressionIs(stripeSuffix.condition, "event.type.endsWith('.created')")
    && literal(stripeSuffix.whenTrue, 'created')
    && ts.isConditionalExpression(stripeSuffix.whenFalse)
    && expressionIs(stripeSuffix.whenFalse.condition, "event.type.endsWith('.deleted')")
    && branchValues(stripeSuffix.whenFalse, 'deleted', 'updated');

  const criteria = {
    'auth.step_up_requested': emitsStepUp(challenge, event => literal(event, 'step_up_challenge_created')),
    'auth.step_up_approved': emitsStepUp(verify, event => literal(event, 'step_up_verified')),
    'auth.step_up_denied': emitsStepUp(verify, event => literal(event, 'step_up_failed'))
      && emitsStepUp(challenge, event => branchValues(event, 'step_up_expired', 'step_up_failed')),
    'auth.step_up_expired': emitsStepUp(challenge, event => branchValues(event, 'step_up_expired', 'step_up_failed'))
      && emitsStepUp(verify, event => expressionIs(event, 'auditFailureEvent(verification.error)'))
      && /return 'step_up_expired' as const/.test(source(verify).statements
        .find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'auditFailureEvent')?.body
        ?.statements.find(node => ts.isIfStatement(node))?.getText() ?? ''),
    'billing.subscription_updated': stripeSuffixMatches
      && hasIfCondition(stripe, 'processStripeWebhookEvent', expression =>
        containsComparison(expression, 'event.type', 'customer.subscription.updated'))
      && hasCall(stripe, 'upsertSubscriptionFromStripe',
      ([, event]) => expressionIs(event, 'event'), 'processStripeWebhookEvent')
      && hasCall(stripe, 'recordBillingWebhookAudit', ([input]) =>
        expressionIs(property(input, 'action'), '`billing.subscription_${suffix}`'), 'upsertSubscriptionFromStripe')
      && hasCall(stripe, 'writeAuditLog', ([input]) => expressionIs(property(input, 'action'), 'input.action'), 'recordBillingWebhookAudit'),
    'document.approval_changed': hasCall(approval, 'createAuditEvent',
      ([input]) => branchValues(property(input, 'action'), 'document_approved', 'document_rejected')),
    'export.created': auditAction('src/app/api/enterprise-readiness/export/route.ts', 'enterprise_readiness.exported', 'GET'),
    'gdpr.export': auditAction('src/app/api/gdpr/export/route.ts', 'gdpr_export_requested', 'GET'),
    'gdpr.delete_requested': auditAction('src/app/api/gdpr/delete-request/route.ts', 'gdpr_delete_requested'),
    'team.invite_created': auditAction('src/app/api/team/invites/route.ts', 'team_invite_created'),
    'team.member_removed': membershipAudit('src/app/api/team/members/remove/route.ts',
      'removeMemberWithChainedAuditAtomic', 'remove_organization_member_audited_atomic', 'team.member_removed'),
    'team.member_role_changed': membershipAudit('src/app/api/team/members/role/route.ts',
      'changeMemberRoleWithChainedAuditAtomic', 'change_organization_member_role_audited_atomic', 'team_member_role_changed'),
    'permission.changed': hasCall('src/app/api/team/group-access-policies/route.ts', 'applyGroupAccessPolicy', () => true)
      && hasCall('src/server/enterprise/group-access-admin.ts', 'rpc',
        ([name]) => literal(name, 'apply_enterprise_group_access_policy_change_atomic'), 'applyGroupAccessPolicy')
      && /insert\s+into\s+public\.enterprise_group_access_policy_events\s*\([^)]*\baction\b[^)]*\)\s*select[^;]+case when v_result\.outcome = 'created' then 'created' else 'updated' end/i
        .test(sqlFunction(groupSql, 'apply_enterprise_group_access_policy_change_atomic')),
    'risk.create': commercialAction('risk', 'create'),
    'risk.delete': commercialAction('risk', 'delete'),
    'vendor.create': commercialAction('vendor', 'create'),
    'vendor.delete': commercialAction('vendor', 'delete'),
    'security.settings_changed': auditAction('src/app/api/security/settings/route.ts', 'security_settings_changed'),
  };

  return Object.entries(criteria).filter(([, covered]) => !covered).map(([criterion]) => criterion);
}

function run() {
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
  // Retain the existing source checks for the other criteria. The central
  // AuditAction declaration is not part of the emitter sources.
  const productionAuditSources = [serverActionAudit, ...criticalSourceFiles.map(read)].join('\n');
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

  for (const action of checkMappedAuditCoverage(read)) {
    failures.push(`production audit emitter missing for criterion: ${action}`);
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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
