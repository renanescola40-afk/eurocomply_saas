export const SECURITY_CI_CHECKS = Object.freeze([
  'security:package-lock',
  'security:npm-audit:all',
  'security:public-secrets',
  'security:production-secrets',
  'security:supply-chain',
  'security:ci-cd',
  'security:rls:advisory',
  'security:step-up',
  'security:client-boundaries',
  'security:auth-tokens',
  'security:authorization-bola',
  'security:server-action-identity',
  'security:protected-routes',
  'security:headers',
  'security:no-store',
  'security:origin-guards',
  'security:no-open-proxy',
  'security:internal-maintenance',
  'security:ops-readiness',
  'security:public-verifiers',
  'security:public-errors',
  'security:csv-exports',
  'security:document-filenames',
  'security:upload',
  'security:upload-content-scan',
  'security:upload-scanner:ci',
  'security:billing-webhook-body',
  'security:responses',
  'security:logs',
  'security:api-endpoints',
  'security:api-guards',
  'security:enterprise-api',
  'security:public-claims',
]);

export function hasSecurityCiCheck(check) {
  return SECURITY_CI_CHECKS.includes(check);
}

export function securityCiCheckRunsBefore(first, second) {
  const firstIndex = SECURITY_CI_CHECKS.indexOf(first);
  const secondIndex = SECURITY_CI_CHECKS.indexOf(second);
  return firstIndex >= 0 && secondIndex > firstIndex;
}
