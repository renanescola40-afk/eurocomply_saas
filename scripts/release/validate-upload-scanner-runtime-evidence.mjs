function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

const FULL_SHA = /^[a-f0-9]{40}$/i;
const NUMERIC = /^\d+$/;
const ALLOWED_EVENTS = new Set(['push', 'pull_request', 'workflow_dispatch']);
const WORKFLOW_NAME = 'RISCK COMPLY Upload Security CI';
const WORKFLOW_FILE = '.github/workflows/upload-security-ci.yml';

export function validateUploadScannerRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
    expectedCommitSha = '',
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const normalizedExpectedSha = String(expectedCommitSha ?? '').trim().toLowerCase();
  const commitSha = String(evidence?.runtimeContext?.commitSha ?? '').trim().toLowerCase();

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
  if (!NUMERIC.test(String(evidence?.runtimeContext?.githubRunId ?? ''))) {
    failures.push('runtimeContext.githubRunId must be numeric');
  }
  if (!NUMERIC.test(String(evidence?.runtimeContext?.githubRunAttempt ?? ''))) {
    failures.push('runtimeContext.githubRunAttempt must be numeric');
  }
  if (!ALLOWED_EVENTS.has(String(evidence?.runtimeContext?.githubEventName ?? ''))) {
    failures.push('runtimeContext.githubEventName must be an allowed GitHub event');
  }
  if (evidence?.runtimeContext?.githubWorkflow !== WORKFLOW_NAME) {
    failures.push(`runtimeContext.githubWorkflow must be ${WORKFLOW_NAME}`);
  }
  if (evidence?.runtimeContext?.githubWorkflowFile !== 'upload-security-ci.yml') {
    failures.push('runtimeContext.githubWorkflowFile must be upload-security-ci.yml');
  }
  if (evidence?.runtimeContext?.repository !== expectedRepository) {
    failures.push(`runtimeContext.repository must be ${expectedRepository}`);
  }
  if (evidence?.runtimeContext?.branch !== expectedBranch) {
    failures.push(`runtimeContext.branch must be ${expectedBranch}`);
  }
  if (!FULL_SHA.test(commitSha)) {
    failures.push('runtimeContext.commitSha must be a full commit SHA');
  }
  if (normalizedExpectedSha) {
    if (!FULL_SHA.test(normalizedExpectedSha)) {
      failures.push('expectedCommitSha must be a full commit SHA');
    } else if (commitSha !== normalizedExpectedSha) {
      failures.push('runtimeContext.commitSha must match expectedCommitSha');
    }
  }

  if (evidence?.sourceWorkflow?.name !== WORKFLOW_NAME) {
    failures.push(`sourceWorkflow.name must be ${WORKFLOW_NAME}`);
  }
  if (evidence?.sourceWorkflow?.file !== WORKFLOW_FILE) {
    failures.push(`sourceWorkflow.file must be ${WORKFLOW_FILE}`);
  }
  if (!NUMERIC.test(String(evidence?.sourceWorkflow?.runId ?? ''))) {
    failures.push('sourceWorkflow.runId must be numeric');
  }
  if (!NUMERIC.test(String(evidence?.sourceWorkflow?.runAttempt ?? ''))) {
    failures.push('sourceWorkflow.runAttempt must be numeric');
  }
  if (!ALLOWED_EVENTS.has(String(evidence?.sourceWorkflow?.event ?? ''))) {
    failures.push('sourceWorkflow.event must be an allowed GitHub event');
  }
  if (evidence?.sourceWorkflow?.exactShaBound !== true) {
    failures.push('sourceWorkflow.exactShaBound must be true');
  }
  if (evidence?.sourceWorkflow?.artifact !== `upload-security-runtime-proof-${commitSha}`) {
    failures.push('sourceWorkflow.artifact must match the exact commit SHA');
  }
  if (
    String(evidence?.sourceWorkflow?.runId ?? '') !==
    String(evidence?.runtimeContext?.githubRunId ?? '')
  ) {
    failures.push('sourceWorkflow.runId must match runtimeContext.githubRunId');
  }
  if (
    String(evidence?.sourceWorkflow?.runAttempt ?? '') !==
    String(evidence?.runtimeContext?.githubRunAttempt ?? '')
  ) {
    failures.push('sourceWorkflow.runAttempt must match runtimeContext.githubRunAttempt');
  }

  if (evidence?.liveProviderProof?.status !== 'passed') {
    failures.push('liveProviderProof.status must be passed');
  }
  if (evidence?.liveProviderProof?.providerIsReal !== true) {
    failures.push('liveProviderProof.providerIsReal must be true');
  }
  if (!['clamav', 'clamd', 'http', 'generic-http', 'webhook'].includes(
    String(evidence?.liveProviderProof?.provider ?? ''),
  )) {
    failures.push('liveProviderProof.provider must be a supported real provider');
  }
  if (evidence?.liveProviderProof?.scanStatus !== 'clean') {
    failures.push('liveProviderProof.scanStatus must be clean');
  }
  if (evidence?.liveProviderProof?.scanRequired !== true) {
    failures.push('liveProviderProof.scanRequired must be true');
  }
  if (evidence?.liveProviderProof?.blockedIfNotClean !== false) {
    failures.push('liveProviderProof.blockedIfNotClean must be false for a clean verdict');
  }
  if (evidence?.liveProviderProof?.providerResponseBodyPersisted !== false) {
    failures.push('liveProviderProof.providerResponseBodyPersisted must be false');
  }
  if (evidence?.liveProviderProof?.providerResponseMessagePersisted !== false) {
    failures.push('liveProviderProof.providerResponseMessagePersisted must be false');
  }
  if (evidence?.liveProviderProof?.fixtureBytesCommitted !== false) {
    failures.push('liveProviderProof.fixtureBytesCommitted must be false');
  }
  if (!/^[a-f0-9]{64}$/i.test(String(evidence?.liveProviderProof?.fileHash ?? ''))) {
    failures.push('liveProviderProof.fileHash must be a SHA-256 digest');
  }
  if (evidence?.acceptanceCriteria?.enterpriseUploadRequiresCleanScan !== true) {
    failures.push('acceptanceCriteria.enterpriseUploadRequiresCleanScan must be true');
  }
  if (evidence?.acceptanceCriteria?.scannerUnavailableBlocksUpload !== true) {
    failures.push('acceptanceCriteria.scannerUnavailableBlocksUpload must be true');
  }
  if (evidence?.acceptanceCriteria?.scannerTimeoutBlocksUpload !== true) {
    failures.push('acceptanceCriteria.scannerTimeoutBlocksUpload must be true');
  }
  if (evidence?.acceptanceCriteria?.scannerMalwareOrSuspiciousBlocksUpload !== true) {
    failures.push('acceptanceCriteria.scannerMalwareOrSuspiciousBlocksUpload must be true');
  }
  if (evidence?.acceptanceCriteria?.cleanScanAllowsUpload !== true) {
    failures.push('acceptanceCriteria.cleanScanAllowsUpload must be true');
  }

  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) {
    failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  }
  if (evidence?.evidenceIntegrity?.credentialsStored !== false) {
    failures.push('evidenceIntegrity.credentialsStored must be false');
  }
  if (evidence?.evidenceIntegrity?.rawProviderResponseStored !== false) {
    failures.push('evidenceIntegrity.rawProviderResponseStored must be false');
  }
  if (evidence?.evidenceIntegrity?.providerResponseBodyStored !== false) {
    failures.push('evidenceIntegrity.providerResponseBodyStored must be false');
  }
  if (evidence?.evidenceIntegrity?.providerResponseMessageStored !== false) {
    failures.push('evidenceIntegrity.providerResponseMessageStored must be false');
  }
  if (evidence?.evidenceIntegrity?.fixtureBytesCommitted !== false) {
    failures.push('evidenceIntegrity.fixtureBytesCommitted must be false');
  }
  if (evidence?.evidenceIntegrity?.exactShaBound !== true) {
    failures.push('evidenceIntegrity.exactShaBound must be true');
  }
  if (evidence?.evidenceIntegrity?.sourceRunBound !== true) {
    failures.push('evidenceIntegrity.sourceRunBound must be true');
  }

  return failures;
}
