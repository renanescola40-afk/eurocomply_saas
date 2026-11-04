import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifySEC05Evidence } from '../../scripts/release/verify-g1-sec05-evidence.mjs';

// Synthetic in-memory fixtures test the verifier only. They are NOT a provider
// report and MUST NOT be copied to the accepted evidence directory.
const baseline = 'a'.repeat(40);
const sha = 'b'.repeat(40);
const digest = 'c'.repeat(64);
const checks = ['gitleaksHistory', 'publicSecretScan', 'clientBoundaryScan',
  'logSanitization', 'secretProviderReadiness', 'typecheck', 'build'];
function example() {
  return {
    schema: 'risck-comply.g1-sec05-runtime-evidence.v1',
    subject: 'SEC-05', gateId: 'A-04', sourceBaselineSha: baseline,
    release: { gitSha: sha },
    ci: { provider: 'circleci', gitSha: sha, runId: 123, conclusion: 'success',
      checks: Object.fromEntries(checks.map(x => [x, {status:'PASS', gitSha:sha, logSha256:digest}])) },
    browserBundle: {gitSha: sha, artifactSha256:digest, scanLogSha256:digest,
      filesInspected:1, secretValueMatches:0, serverOnlyEnvReferences:0, status:'PASS'},
    vercel: {projectId:'prj_APpXAyQFy1Gie50xfbO45zjkyUSm', deployedGitSha:sha,
      target:'production', readyState:'READY', deploymentId:'dpl_ABC123',
      domain:'www.risckcomply.com', domainVerified:true, validTlsCertificate:true,
      verifiedTlsHandshake:true, completeRedactedEnvInventory:true,
      serverSecretsNotClientExposed:true, configurationReadbackSha256:digest},
    postgres: Object.fromEntries([['qa','zrxrrfbllsxtleyxjpsz'],['production','tganhbbhfxcpblmgqprg']].map(([env,id]) =>
      [env, {projectId:id, currentConnectionEncrypted:true, tlsVersion:'TLSv1.3',
        rejectsNonTlsConnections:true, encryptedAtRestVerified:true, providerAttestationSha256:digest}])),
    independentReview: {gitSha:sha, approved:true, qualified:true, reviewer:'Independent test reviewer',
      providerReviewId:321, approvedAt:'2026-11-01T00:00:00Z'},
    secretsRedacted:true, productionWritesOrDeploymentsForEvidence:false,
  };
}
function mutationFails(name, modify, reason) {
  test(name, () => {const p=example();modify(p);
    assert.ok(verifySEC05Evidence(p,baseline).some(x=>x.includes(reason)));});
}
test('fully populated synthetic structural contract is accepted by pure helper only', () =>
  assert.deepEqual(verifySEC05Evidence(example(), baseline), []));
mutationFails('partial provider report cannot impersonate accepted proof', p=>{p.schema='risck-comply.sec05-provider-transport-preacceptance.v1';p.ci={};},'wrong criterion');
mutationFails('wrong source baseline fails', p=>{p.sourceBaselineSha='d'.repeat(40)},'unbound source baseline');
mutationFails('unverified or mismatched source SHA CI fails', p=>{p.ci.gitSha='d'.repeat(40)},'successful exact-SHA CI');
mutationFails('missing secret history scan fails', p=>{delete p.ci.checks.gitleaksHistory},'gitleaksHistory');
mutationFails('incomplete client boundary scan fails', p=>{p.ci.checks.clientBoundaryScan.status='PENDING'},'clientBoundaryScan');
mutationFails('bundle with sensitive references fails', p=>{p.browserBundle.serverOnlyEnvReferences=1},'actual browser bundle');
mutationFails('unscanned bundle fails', p=>{p.browserBundle.filesInspected=0},'actual browser bundle');
mutationFails('unintegrated production candidate fails', p=>{p.vercel.deployedGitSha='e'.repeat(40)},'wrong SHA');
mutationFails('unverified HTTPS handshake fails', p=>{p.vercel.verifiedTlsHandshake=false},'TLS/secret configuration');
mutationFails('incomplete provider env inventory fails', p=>{p.vercel.completeRedactedEnvInventory=false},'TLS/secret configuration');
mutationFails('SSL observed but not required fails closed', p=>{p.postgres.production.rejectsNonTlsConnections='NOT_VERIFIED'},'TLS enforcement');
mutationFails('at-rest protection not attested fails closed', p=>{p.postgres.qa.encryptedAtRestVerified=false},'at-rest provider proof');
mutationFails('non-independent reviewer fails', p=>{p.independentReview.approved=false},'independent exact-SHA');
mutationFails('absent review ID fails', p=>{p.independentReview.providerReviewId=0},'independent exact-SHA');
mutationFails('redaction not attested fails', p=>{p.secretsRedacted=false},'redaction');
mutationFails('unbounded writes in evidence fails', p=>{p.productionWritesOrDeploymentsForEvidence=true},'redaction');

test('actual partial SEC-05 provider readback cannot be accepted as full gate proof', () => {
  const preacceptance = JSON.parse(readFileSync(
    new URL('../../docs/enterprise/evidence/SEC05_PROVIDER_TRANSPORT_PREACCEPTANCE_2026-11-04.json', import.meta.url),
    'utf8',
  ));
  const failures = verifySEC05Evidence(preacceptance, baseline);
  assert.ok(failures.some(x => x.includes('wrong criterion or proof schema')));
  assert.ok(failures.some(x => x.includes('browser bundle')));
  assert.ok(failures.some(x => x.includes('TLS enforcement')));
  assert.ok(failures.some(x => x.includes('independent exact-SHA review')));
});
