// SEC-05 source-level evidence admission contract. This is NOT provider verification,
// an independent reviewer approval or an Enterprise release decision.
const FULL_SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const REQUIRED = Object.freeze({
  source_secret_scan: 'circleci',
  client_boundary_scan: 'circleci',
  emitted_browser_bundle_scan: 'circleci',
  runtime_log_redaction: 'vercel',
  tls_certificate: 'vercel',
  production_environment_scope: 'vercel',
  database_encryption_at_rest: 'supabase',
  storage_encryption_at_rest: 'supabase',
});
const PROVIDER_URLS = {
  circleci: /^https:\/\/app\.circleci\.com\//,
  vercel: /^https:\/\/vercel\.com\//,
  supabase: /^https:\/\/supabase\.com\//,
};
const VALID_STATUS = 'PASS';

export const SEC05_REQUIRED_EVIDENCE_TYPES = Object.freeze(Object.keys(REQUIRED));

export function verifySec05Evidence(proof, sourceSha) {
  const reasons = [];
  const fail = (reason) => reasons.push('PASS evidence content invalid: SEC-05 (' + reason + ')');
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return ['PASS evidence content invalid: SEC-05 (not an object)'];
  if (proof.schema !== 'risck-comply.g1.sec05-secrets-encryption.v1') fail('schema mismatch');
  if (proof.subject !== 'SEC-05') fail('subject mismatch');
  if (!FULL_SHA.test(String(sourceSha ?? '')) ||
      proof.sourceSha !== sourceSha ||
      proof.productionDeploymentSha !== sourceSha) fail('exact production source SHA mismatch');
  if (proof.productionDomain !== 'www.risckcomply.com') fail('production domain mismatch');
  const vercel = proof.vercel ?? {};
  if (vercel.projectId !== 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm' ||
      vercel.gitSha !== sourceSha || vercel.target !== 'production' ||
      vercel.readyState !== 'READY' || vercel.domainVerified !== true ||
      !/^dpl_[A-Za-z0-9]+$/.test(String(vercel.deploymentId ?? ''))) {
    fail('production deployment provider attestation incomplete');
  }
  const database = proof.database ?? {};
  if (database.productionProjectId !== 'tganhbbhfxcpblmgqprg' ||
      database.qaProjectId !== 'zrxrrfbllsxtleyxjpsz') {
    fail('Supabase provider scope mismatch');
  }
  const checks = proof.checks ?? {};
  for (const name of [
    'zeroKnownHighCriticalSecretExposures',
    'noPrivilegedSecretsInClientSource',
    'noPrivilegedSecretsInEmittedBrowserBundles',
    'noPrivilegedCredentialsInLogs',
    'productionEnvLeastPrivilege',
    'tlsDomainAndCertificateVerified',
    'databaseEncryptionAtRestVerified',
    'storageEncryptionAtRestVerified',
  ]) if (checks[name] !== true) fail('mandatory security check not demonstrated: ' + name);
  const items = Array.isArray(proof.evidence) ? proof.evidence : [];
  if (items.length !== SEC05_REQUIRED_EVIDENCE_TYPES.length) fail('incomplete evidence coverage');
  const observed = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      fail('malformed evidence entry'); continue;
    }
    if (!(item.kind in REQUIRED) || observed.has(item.kind)) {
      fail('unsupported or repeated evidence kind'); continue;
    }
    observed.add(item.kind);
    if (item.provider !== REQUIRED[item.kind] ||
        item.status !== VALID_STATUS ||
        item.sourceSha !== sourceSha ||
        !DIGEST.test(String(item.artifactSha256 ?? '')) ||
        !PROVIDER_URLS[item.provider]?.test(String(item.url ?? '')) ||
        !Number.isFinite(Date.parse(item.observedAt)) ||
        Date.parse(item.observedAt) > Date.now()) {
      fail('invalid provider result or artifact provenance: ' + item.kind);
    }
  }
  for (const name of SEC05_REQUIRED_EVIDENCE_TYPES) {
    if (!observed.has(name)) fail('missing required proof: ' + name);
  }
  if (proof.acceptanceDecision !== 'PASS_SEC05_AT_OBSERVED_SHA' ||
      proof.independentReviewerAcknowledged !== true) fail('independent reviewer gate not attested');
  return reasons;
}
