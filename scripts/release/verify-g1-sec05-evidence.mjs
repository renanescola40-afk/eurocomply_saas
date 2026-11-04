// SEC-05 structural acceptance admission. A passing document is NOT a provider
// trust oracle: the independently approved exact-SHA provider readbacks and
// Evidence Factory gate decision remain required outside this function.
const FULL_SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const CHECKS = ['gitleaksHistory', 'publicSecretScan', 'clientBoundaryScan',
  'logSanitization', 'secretProviderReadiness', 'typecheck', 'build'];

export function verifySEC05Evidence(proof, baselineSha) {
  const errors = [];
  const fail = (reason) => errors.push(reason);
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return ['evidence is not an object'];
  if (proof.schema !== 'risck-comply.g1-sec05-runtime-evidence.v1' || proof.subject !== 'SEC-05' || proof.gateId !== 'A-04')
    fail('wrong criterion or proof schema');
  if (proof.sourceBaselineSha !== baselineSha || !FULL_SHA.test(String(baselineSha)))
    fail('unbound source baseline');
  const sha = proof.release?.gitSha;
  if (!FULL_SHA.test(String(sha ?? ''))) fail('release git SHA missing');
  const ci = proof.ci ?? {};
  if (ci.gitSha !== sha || ci.conclusion !== 'success' ||
      !['circleci', 'github-actions'].includes(ci.provider) ||
      !Number.isSafeInteger(ci.runId) || ci.runId <= 0)
    fail('successful exact-SHA CI run missing');
  for (const name of CHECKS) {
    const check = ci.checks?.[name];
    if (check?.status !== 'PASS' || check?.gitSha !== sha ||
        !SHA256.test(String(check?.logSha256 ?? '')))
      fail('missing exact-SHA scanner/test evidence: ' + name);
  }
  const bundle = proof.browserBundle ?? {};
  if (bundle.gitSha !== sha || !SHA256.test(String(bundle.artifactSha256 ?? '')) ||
      !SHA256.test(String(bundle.scanLogSha256 ?? '')) ||
      !Number.isSafeInteger(bundle.filesInspected) || bundle.filesInspected < 1 ||
      bundle.secretValueMatches !== 0 || bundle.serverOnlyEnvReferences !== 0 ||
      bundle.status !== 'PASS')
    fail('actual browser bundle was not proven free of secrets');
  const v = proof.vercel ?? {};
  if (v.projectId !== 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm' ||
      v.deployedGitSha !== sha || v.target !== 'production' || v.readyState !== 'READY' ||
      !/^dpl_[a-zA-Z0-9]+$/.test(String(v.deploymentId ?? '')) ||
      v.domain !== 'www.risckcomply.com' || v.domainVerified !== true ||
      v.validTlsCertificate !== true || v.verifiedTlsHandshake !== true ||
      v.completeRedactedEnvInventory !== true || v.serverSecretsNotClientExposed !== true ||
      !SHA256.test(String(v.configurationReadbackSha256 ?? '')))
    fail('production deployment/TLS/secret configuration incomplete or wrong SHA');
  const expected = { qa: 'zrxrrfbllsxtleyxjpsz', production: 'tganhbbhfxcpblmgqprg' };
  for (const [env, id] of Object.entries(expected)) {
    const pg = proof.postgres?.[env] ?? {};
    if (pg.projectId !== id || pg.currentConnectionEncrypted !== true ||
        !['TLSv1.2', 'TLSv1.3'].includes(pg.tlsVersion) || pg.rejectsNonTlsConnections !== true ||
        pg.encryptedAtRestVerified !== true ||
        !SHA256.test(String(pg.providerAttestationSha256 ?? '')))
      fail('missing PostgreSQL TLS enforcement or at-rest provider proof: ' + env);
  }
  const review = proof.independentReview ?? {};
  if (review.gitSha !== sha || review.approved !== true || review.qualified !== true ||
      !Number.isSafeInteger(review.providerReviewId) || review.providerReviewId <= 0 ||
      !String(review.reviewer ?? '').trim() ||
      !Number.isFinite(Date.parse(review.approvedAt)) ||
      Date.parse(review.approvedAt) > Date.now())
    fail('independent exact-SHA review missing');
  if (proof.secretsRedacted !== true || proof.productionWritesOrDeploymentsForEvidence !== false)
    fail('redaction and non-mutation boundary not established');
  return errors;
}
