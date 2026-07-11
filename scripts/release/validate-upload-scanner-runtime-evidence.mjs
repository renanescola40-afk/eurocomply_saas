function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateUploadScannerRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.evidenceItem !== 'upload-malware-scan-validation') {
    failures.push('evidenceItem must be upload-malware-scan-validation');
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt);
  if (generatedAt === null) {
    failures.push('generatedAt must be an ISO-8601 timestamp');
  } else {
    const ageMs = nowMs - generatedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeMs) failures.push(`generatedAt is older than ${maxAgeDays} days`);
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (evidence?.runtimeContext?.generatedByGithubActions !== true) {
    failures.push('runtimeContext.generatedByGithubActions must be true');
  }
  if (!String(evidence?.runtimeContext?.githubRunId ?? '').trim()) {
    failures.push('runtimeContext.githubRunId is required');
  }
  if (evidence?.runtimeContext?.repository !== expectedRepository) {
    failures.push(`runtimeContext.repository must be ${expectedRepository}`);
  }
  if (evidence?.runtimeContext?.branch !== expectedBranch) {
    failures.push(`runtimeContext.branch must be ${expectedBranch}`);
  }
  if (!/^[a-f0-9]{40}$/i.test(String(evidence?.runtimeContext?.commitSha ?? ''))) {
    failures.push('runtimeContext.commitSha must be a full commit SHA');
  }
  if (evidence?.liveProviderProof?.status !== 'passed') {
    failures.push('liveProviderProof.status must be passed');
  }
  if (evidence?.liveProviderProof?.providerIsReal !== true) {
    failures.push('liveProviderProof.providerIsReal must be true');
  }
  if (evidence?.liveProviderProof?.scanStatus !== 'clean') {
    failures.push('liveProviderProof.scanStatus must be clean');
  }
  if (evidence?.liveProviderProof?.scanRequired !== true) {
    failures.push('liveProviderProof.scanRequired must be true');
  }
  if (evidence?.liveProviderProof?.providerResponseBodyPersisted !== false) {
    failures.push('liveProviderProof.providerResponseBodyPersisted must be false');
  }
  if (evidence?.liveProviderProof?.fixtureBytesCommitted !== false) {
    failures.push('liveProviderProof.fixtureBytesCommitted must be false');
  }
  if (!/^[a-f0-9]{64}$/i.test(String(evidence?.liveProviderProof?.fileHash ?? ''))) {
    failures.push('liveProviderProof.fileHash must be a SHA-256 digest');
  }
  if (evidence?.acceptanceCriteria?.scannerUnavailableBlocksUpload !== true) {
    failures.push('acceptanceCriteria.scannerUnavailableBlocksUpload must be true');
  }
  if (evidence?.acceptanceCriteria?.scannerMalwareOrSuspiciousBlocksUpload !== true) {
    failures.push('acceptanceCriteria.scannerMalwareOrSuspiciousBlocksUpload must be true');
  }
  if (evidence?.acceptanceCriteria?.cleanScanAllowsUpload !== true) {
    failures.push('acceptanceCriteria.cleanScanAllowsUpload must be true');
  }

  return failures;
}
