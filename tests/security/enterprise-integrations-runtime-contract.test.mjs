import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const tenantMigration = await readFile('supabase/migrations/20260721114500_enterprise_integrations_tenant_relations.sql', 'utf8');
const validation = await readFile('scripts/security/validate-enterprise-integrations-runtime.sql', 'utf8');
const workflow = await readFile('.github/workflows/enterprise-integrations-runtime-proof.yml', 'utf8');

test('sensitive integration relationships are organization-bound', () => {
  for (const constraint of [
    'enterprise_api_keys_service_account_tenant_fk',
    'enterprise_api_keys_rotation_tenant_fk',
    'enterprise_webhook_deliveries_subscription_tenant_fk',
    'enterprise_scim_tokens_connection_tenant_fk',
    'enterprise_integration_audit_service_account_tenant_fk',
  ]) {
    assert.match(tenantMigration, new RegExp(constraint));
  }
  assert.ok((tenantMigration.match(/foreign key \([^)]*, organization_id\)/g) ?? []).length >= 5);
  assert.ok((tenantMigration.match(/references public\.[a-z_]+\(id, organization_id\)/g) ?? []).length >= 5);
});

test('runtime validator is fail-closed for schema, RLS, composite FKs and audit immutability', () => {
  for (const control of ['INT-SCHEMA', 'INT-RLS', 'INT-TENANT-FK', 'INT-AUDIT-IMMUTABLE', 'INT-CREDENTIAL-DIGEST']) {
    assert.match(validation, new RegExp(control));
  }
  assert.match(validation, /raise exception 'enterprise integrations runtime validation failed'/);
  assert.match(validation, /relrowsecurity and c\.relforcerowsecurity/);
  assert.match(validation, /not has_table_privilege\('authenticated'/);
});

test('protected workflow binds evidence to exact current main through a disposable project database', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /environment: production-integrations-proof/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /git rev-parse origin\/main/);
  assert.match(workflow, /GITHUB_SHA/);
  assert.match(workflow, /GITHUB_REF_NAME/);
  assert.match(workflow, /supabase\/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520/);
  assert.match(workflow, /version: 2\.101\.0/);
  assert.match(workflow, /run-ephemeral-project-schema-replay\.mjs/);
  assert.doesNotMatch(workflow, /manage-ephemeral-recovery-database\.mjs start-project/);
  assert.match(workflow, /manage-ephemeral-recovery-database\.mjs stop/);
  assert.match(workflow, /Remove disposable project database[\s\S]*?if: always\(\)/);
  assert.doesNotMatch(workflow, /secrets\.RECOVERY_ISOLATED_DATABASE_URL/);
  assert.match(workflow, /DATABASE_URL=%s/);
  assert.match(workflow, /release_sha:sha/);
  assert.match(workflow, /status:"PASS"/);
  assert.match(workflow, /retention-days: 90/);
  assert.doesNotMatch(workflow, /echo .*DATABASE_URL|cat .*DATABASE_URL/);
});

test('exact-SHA project migrations replace selective manual migration application', () => {
  assert.doesNotMatch(workflow, /apply_migrations:/);
  assert.doesNotMatch(workflow, /20260721113000_enterprise_integrations_platform\.sql/);
  assert.doesNotMatch(workflow, /20260721114500_enterprise_integrations_tenant_relations\.sql/);
  assert.match(workflow, /run-ephemeral-project-schema-replay\.mjs/);
});
