import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifySec05Evidence, SEC05_REQUIRED_EVIDENCE_TYPES } from '../../scripts/release/verify-sec05-evidence.mjs';

const sha = 'a'.repeat(40);
const observedAt = '2026-10-22T21:03:16.517Z';
const providers = {
  source_secret_scan: 'circleci',
  client_boundary_scan: 'circleci',
  emitted_browser_bundle_scan: 'circleci',
  runtime_log_redaction: 'vercel',
  tls_certificate: 'vercel',
  production_environment_scope: 'vercel',
  database_encryption_at_rest: 'supabase',
  storage_encryption_at_rest: 'supabase',
};
const urls = {
  circleci: 'https://app.circleci.com/pipelines/github/renanescola40-afk/eurocomply_saas/999',
  vercel: 'https://vercel.com/renanescola40-afks-projects/eurocomply-saas',
  supabase: 'https://supabase.com/dashboard/project/tganhbbhfxcpblmgqprg',
};
function fixture() {
  return {
    schema:'risck-comply.g1.sec05-secrets-encryption.v1',
    subject:'SEC-05',observedAt,sourceSha:sha,productionDeploymentSha:sha,
    productionDomain:'www.risckcomply.com',
    vercel: {projectId:'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',gitSha:sha,
      target:'production',readyState:'READY',domainVerified:true,deploymentId:'dpl_test123'},
    database: {productionProjectId:'tganhbbhfxcpblmgqprg',qaProjectId:'zrxrrfbllsxtleyxjpsz'},
    checks: {
      zeroKnownHighCriticalSecretExposures:true,noPrivilegedSecretsInClientSource:true,
      noPrivilegedSecretsInEmittedBrowserBundles:true,noPrivilegedCredentialsInLogs:true,
      productionEnvLeastPrivilege:true,tlsDomainAndCertificateVerified:true,
      databaseEncryptionAtRestVerified:true,storageEncryptionAtRestVerified:true,
    },
    evidence: SEC05_REQUIRED_EVIDENCE_TYPES.map(kind=>({
      kind,provider:providers[kind],status:'PASS',sourceSha:sha,
      artifactSha256:'b'.repeat(64),url:urls[providers[kind]],observedAt,
    })),
    independentReviewerAcknowledged:true,acceptanceDecision:'PASS_SEC05_AT_OBSERVED_SHA',
  };
}
const errors = proof => verifySec05Evidence(proof,sha);
test('synthetic complete shape is accepted by the narrow SEC-05 evidence contract, not by any provider',()=>{
  assert.deepEqual(errors(fixture()),[]);
});
test('missing bundle scan and hidden log scan fail closed',()=>{
  const p=fixture();p.evidence=p.evidence.filter(x=>x.kind!=='emitted_browser_bundle_scan');
  p.checks.noPrivilegedCredentialsInLogs=false;
  assert.ok(errors(p).some(s=>s.includes('missing required proof: emitted_browser_bundle_scan')));
  assert.ok(errors(p).some(s=>s.includes('mandatory security check not demonstrated')));
});
test('unrelated SHA or wrong deployment state is rejected',()=>{
  const p=fixture();p.productionDeploymentSha='c'.repeat(40);p.vercel.readyState='ERROR';
  assert.ok(errors(p).some(s=>s.includes('exact production source SHA mismatch')));
  assert.ok(errors(p).some(s=>s.includes('production deployment provider attestation incomplete')));
});
test('unsupported or duplicated evidence kinds and untrusted provider domains are rejected',()=>{
  const p=fixture();p.evidence[0]={...p.evidence[0],url:'https://example.test/fake'};
  p.evidence[1]={...p.evidence[1],kind:'source_secret_scan'};
  assert.ok(errors(p).some(s=>s.includes('invalid provider result or artifact provenance')));
  assert.ok(errors(p).some(s=>s.includes('unsupported or repeated evidence kind')));
});
test('reviewer acknowledgement and artifact SHA-256 are mandatory',()=>{
  const p=fixture();p.independentReviewerAcknowledged=false;
  p.evidence[0].artifactSha256='test-no-sha';
  assert.ok(errors(p).some(s=>s.includes('independent reviewer gate not attested')));
  assert.ok(errors(p).some(s=>s.includes('invalid provider result or artifact provenance')));
});
