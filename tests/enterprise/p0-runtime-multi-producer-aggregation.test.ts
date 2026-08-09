import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');
const productionFetcher = readFileSync('scripts/enterprise/fetch-production-runtime-evidence.mjs', 'utf8');

describe('P0 exact-SHA multi-producer runtime aggregation', () => {
  it('listens to protected P0 runtime producers', () => {
    for (const producer of [
      'RISCK COMPLY Upload Security CI',
      'Branch Protection Runtime Proof',
      'Auth RBAC Tenant Proof',
      'Supabase Live RLS Validation',
      'Production Runtime Proof',
    ]) {
      expect(workflow).toContain(`- ${producer}`);
    }
  });

  it('retrieves each producer through its hardened exact-SHA fetcher', () => {
    for (const fetcher of [
      'aggregate-upload-scanner-runtime-evidence.mjs',
      'fetch-branch-protection-runtime-evidence.mjs',
      'fetch-auth-rbac-evidence.mjs',
      'fetch-supabase-rls-evidence.mjs',
      'fetch-production-runtime-evidence.mjs',
    ]) {
      expect(workflow).toContain(fetcher);
    }

    expect(workflow).toContain('ASSESSED_SHA: ${{ github.event.workflow_run.head_sha');
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
  });

  it('requires the triggering producer but keeps other discovery fail-closed and optional', () => {
    expect(workflow).toContain("AUTH_RBAC_RUNTIME_EVIDENCE_REQUIRED: ${{ github.event.workflow_run.name == 'Auth RBAC Tenant Proof' && 'true' || 'false' }}");
    expect(workflow).toContain("SUPABASE_RLS_RUNTIME_EVIDENCE_REQUIRED: ${{ github.event.workflow_run.name == 'Supabase Live RLS Validation' && 'true' || 'false' }}");
    expect(workflow).toContain("PRODUCTION_RUNTIME_EVIDENCE_REQUIRED: ${{ github.event.workflow_run.name == 'Production Runtime Proof' && 'true' || 'false' }}");
  });

  it('promotes deployment smoke and release-SHA lineage from the validated production bundle', () => {
    expect(productionFetcher).toContain("const DEPLOYMENT_SMOKE_PATH = 'docs/security/evidence/runtime/deployment-smoke-validation.json'");
    expect(productionFetcher).toContain("const RELEASE_SHA_PATH = 'docs/security/evidence/runtime/runtime-release-sha-validation.json'");
    expect(productionFetcher).toContain('DEPLOYMENT_SMOKE_PATH,');
    expect(productionFetcher).toContain('RELEASE_SHA_PATH,');
    expect(productionFetcher).toContain('rmSync(join(root, DEPLOYMENT_SMOKE_PATH), { force: true })');
    expect(productionFetcher).toContain('rmSync(join(root, RELEASE_SHA_PATH), { force: true })');
  });

  it('does not weaken read-only workflow permissions or persist evidence back to git', () => {
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('git push');
  });
});
