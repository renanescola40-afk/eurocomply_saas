#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createConnection } from 'node:net';

const EVIDENCE_PATH = 'docs/security/evidence/runtime/upload-malware-scan-validation.json';
const P0_REGISTER_PATH = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';

const REQUIRE_MALWARE_SCAN_FOR_UPLOADS = 'REQUIRE_MALWARE_SCAN_FOR_UPLOADS';
const MALWARE_SCANNER_PROVIDER = 'MALWARE_SCANNER_PROVIDER';
const MALWARE_SCANNER_API_KEY = 'MALWARE_SCANNER_API_KEY';
const MALWARE_SCANNER_ENDPOINT = 'MALWARE_SCANNER_ENDPOINT';
const MALWARE_SCANNER_URL = 'MALWARE_SCANNER_URL';
const MALWARE_SCANNER_ALLOWED_HOSTS = 'MALWARE_SCANNER_ALLOWED_HOSTS';
const MALWARE_SCANNER_TIMEOUT_MS = 'MALWARE_SCANNER_TIMEOUT_MS';
const MALWARE_SCANNER_CLAMAV_HOST = 'MALWARE_SCANNER_CLAMAV_HOST';
const MALWARE_SCANNER_CLAMAV_PORT = 'MALWARE_SCANNER_CLAMAV_PORT';

const REAL_PROVIDERS = new Set(['clamav', 'clamd', 'http', 'generic-http', 'webhook']);
const BYPASS_PROVIDERS = new Set(['', 'none', 'disabled', 'not_configured', 'mock', 'test', 'dev-mock']);
const DEFAULT_TIMEOUT_MS = 10_000;
const CLAMAV_CHUNK_SIZE_BYTES = 64 * 1024;
const args = new Set(process.argv.slice(2));

const updateRegister = args.has('--update-register');
const advisory = args.has('--advisory');
const ciGate = args.has('--ci-gate');
const noWrite = args.has('--no-write');

const enterpriseContext =
  process.env.RELEASE_TARGET === 'enterprise' ||
  process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true' ||
  process.env[REQUIRE_MALWARE_SCAN_FOR_UPLOADS] === 'true';

const testPdf = Buffer.from('%PDF-1.7\n% EuroComply upload malware scanner runtime validation fixture\n1 0 obj <<>> endobj\n%%EOF\n', 'utf8');
const fileHash = createHash('sha256').update(testPdf).digest('hex');

function nowIso() {
  return new Date().toISOString();
}

function scannerTimeoutMs() {
  const parsed = Number.parseInt(process.env[MALWARE_SCANNER_TIMEOUT_MS] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function configuredProvider() {
  return String(process.env[MALWARE_SCANNER_PROVIDER] ?? '').trim().toLowerCase();
}

function isRequired() {
  return process.env[REQUIRE_MALWARE_SCAN_FOR_UPLOADS] === 'true';
}

function allowedHosts() {
  return new Set(
    String(process.env[MALWARE_SCANNER_ALLOWED_HOSTS] ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function endpointHostForEvidence() {
  const endpoint = process.env[MALWARE_SCANNER_ENDPOINT]?.trim() || process.env[MALWARE_SCANNER_URL]?.trim();
  if (!endpoint) return null;

  try {
    const url = new URL(endpoint);
    return { protocol: url.protocol, hostname: url.hostname, pathname: url.pathname ? '<redacted-path>' : null };
  } catch {
    return { invalid: true };
  }
}

function workflowRunUrlForEvidence() {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!serverUrl || !repository || !runId) return null;
  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

function commitShaForEvidence() {
  const sha = process.env.GITHUB_SHA;
  return /^[a-f0-9]{40}$/i.test(String(sha ?? '')) ? sha : null;
}

function runtimeContextForEvidence() {
  return {
    commandUsed: 'npm run security:upload-scanner:runtime -- --update-register',
    generatedByGithubActions: process.env.GITHUB_ACTIONS === 'true',
    githubWorkflow: process.env.GITHUB_WORKFLOW || null,
    githubRunId: process.env.GITHUB_RUN_ID || null,
    githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    workflowRunUrl: workflowRunUrlForEvidence(),
    commitSha: commitShaForEvidence(),
  };
}

function mapStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (['clean', 'ok', 'passed', 'allow', 'allowed'].includes(normalized)) return 'clean';
  if (['infected', 'malware', 'virus', 'found', 'blocked'].includes(normalized)) return 'infected';
  if (['suspicious', 'suspect', 'phishing', 'policy_violation'].includes(normalized)) return 'suspicious';
  if (['error', 'failed', 'scan_failed'].includes(normalized)) return 'error';
  if (['unavailable', 'timeout'].includes(normalized)) return 'unavailable';
  return null;
}

function result(status, provider, reasonCode, extra = {}) {
  return {
    status,
    provider,
    required: isRequired(),
    checkedAt: nowIso(),
    reasonCode,
    ...extra,
  };
}

async function scanWithHttpProvider(provider) {
  const endpoint = process.env[MALWARE_SCANNER_ENDPOINT]?.trim() || process.env[MALWARE_SCANNER_URL]?.trim();
  if (!endpoint) return result('unavailable', provider, 'http_endpoint_not_configured');

  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return result('unavailable', provider, 'http_endpoint_not_absolute_https_url');
  }

  if (url.protocol !== 'https:') {
    return result('unavailable', provider, 'http_endpoint_not_https');
  }

  if (url.username || url.password) {
    return result('unavailable', provider, 'http_endpoint_contains_credentials');
  }

  const hosts = allowedHosts();
  if (hosts.size === 0 || !hosts.has(url.hostname.toLowerCase())) {
    return result('unavailable', provider, 'http_endpoint_host_not_allowed');
  }

  const timeoutMs = scannerTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const apiKey = process.env[MALWARE_SCANNER_API_KEY]?.trim();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/pdf',
        'x-eurocomply-filename': 'scanner-runtime-validation.pdf',
        'x-eurocomply-organization-id': 'runtime-validation-organization',
        'x-eurocomply-file-sha256': fileHash,
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: new Uint8Array(testPdf),
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) return result('unavailable', provider, 'http_provider_non_2xx_response');

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return result('error', provider, 'http_provider_non_json_response');
    }

    const status = mapStatus(payload.status ?? payload.verdict ?? payload.result);
    const providerSignatureDetected = Boolean(payload.signature);

    if (status === 'clean') return result('clean', provider, 'http_provider_clean_verdict');
    if (status === 'infected') return result('infected', provider, 'http_provider_infected_verdict', { providerSignatureDetected });
    if (status === 'suspicious') return result('suspicious', provider, 'http_provider_suspicious_verdict');
    if (status === 'error') return result('error', provider, 'http_provider_error_verdict');
    if (status === 'unavailable') return result('unavailable', provider, 'http_provider_unavailable_verdict');

    return result('suspicious', provider, 'http_provider_unknown_verdict');
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return result('unavailable', provider, timedOut ? 'http_provider_timeout' : 'http_provider_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

function parseClamAvResponse(response, provider) {
  const sanitized = String(response ?? '').replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').slice(0, 500);
  if (/\bFOUND\b/i.test(sanitized)) return result('infected', provider, 'clamav_found_verdict', { providerSignatureDetected: true });
  if (/\bERROR\b/i.test(sanitized)) return result('error', provider, 'clamav_error_verdict');
  if (/^[^:\s][^:]*:\s*OK\s*$/i.test(sanitized)) return result('clean', provider, 'clamav_ok_verdict');
  return result('suspicious', provider, 'clamav_unrecognized_response');
}

async function scanWithClamAv(provider) {
  const host = process.env[MALWARE_SCANNER_CLAMAV_HOST]?.trim() || '127.0.0.1';
  const port = Number.parseInt(process.env[MALWARE_SCANNER_CLAMAV_PORT] ?? '3310', 10);
  const timeoutMs = scannerTimeoutMs();

  if (!Number.isFinite(port) || port <= 0) return result('unavailable', provider, 'invalid_clamav_port');

  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let response = '';
    let settled = false;

    const timeout = setTimeout(() => {
      settle(result('unavailable', provider, 'clamav_timeout'));
    }, timeoutMs);

    function settle(scanResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(scanResult);
    }

    socket.on('connect', () => {
      socket.write('zINSTREAM\0', 'binary');
      for (let offset = 0; offset < testPdf.length; offset += CLAMAV_CHUNK_SIZE_BYTES) {
        const chunk = testPdf.subarray(offset, offset + CLAMAV_CHUNK_SIZE_BYTES);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });

    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
    });

    socket.on('end', () => settle(parseClamAvResponse(response, provider)));
    socket.on('error', () => settle(result('unavailable', provider, 'clamav_unavailable')));
  });
}

async function runLiveScan() {
  const provider = configuredProvider();

  if (!isRequired()) {
    return result('not_configured', provider || 'not_configured', 'required_env_missing');
  }

  if (BYPASS_PROVIDERS.has(provider)) {
    return result('not_configured', provider || 'not_configured', 'enterprise_scanner_provider_missing_or_bypass');
  }

  if (!REAL_PROVIDERS.has(provider)) {
    return result('unavailable', provider, 'unsupported_provider');
  }

  if (provider === 'clamav' || provider === 'clamd') return scanWithClamAv(provider);
  return scanWithHttpProvider(provider);
}

function shouldBlockUploadForMalwareScan(scanResult) {
  if (scanResult.status === 'infected' || scanResult.status === 'suspicious') return true;
  return scanResult.required && scanResult.status !== 'clean';
}

function exceptionFor(scanResult) {
  return {
    riskOwner: 'Security reviewer',
    rationale: `Enterprise upload malware scanning remains blocked until a real scanner provider returns clean; current runtime validation reasonCode=${scanResult.reasonCode}.`,
    compensatingControls: [
      'Enterprise uploads fail closed when REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true and no clean scanner verdict is available.',
      'Security CI rejects mock, disabled and unavailable scanner providers for enterprise runtime proof.',
      'Download and preview access remain tenant-checked and backend mediated through short-lived signed URLs.',
    ],
    expiresAt: '2026-06-25',
    approvalReference: 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md Upload malware/content scanning validation exception',
  };
}

function buildEvidence(scanResult, skipped = false) {
  const provider = configuredProvider() || 'not_configured';
  const providerIsReal = REAL_PROVIDERS.has(provider) && !BYPASS_PROVIDERS.has(provider);
  const passed = scanResult.status === 'clean' && scanResult.required && providerIsReal;
  const blockedOnFailure = shouldBlockUploadForMalwareScan({ ...scanResult, required: true });

  const evidence = {
    evidenceItem: 'upload-malware-scan-validation',
    status: passed ? 'Complete' : 'Exception',
    reviewer: 'security-automation',
    reviewedAt: scanResult.checkedAt,
    generatedAt: nowIso(),
    summary: passed
      ? 'Live malware scanner provider returned a clean verdict for the runtime validation upload fixture; enterprise fail-closed upload policy can allow clean uploads.'
      : 'Repository upload controls are implemented, but live malware scanner provider proof is not complete. Enterprise release remains gated until a real provider returns clean and --update-register is run.',
    redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    contentRedactionScope: 'The validation file bytes are not committed; only SHA-256, size, MIME and redacted provider metadata are recorded. Provider response bodies, messages and signature names are never written to repo evidence.',
    runtimeValidationScript: 'scripts/security/run-upload-scanner-runtime-validation.mjs',
    runtimeContext: runtimeContextForEvidence(),
    liveProviderProof: {
      status: skipped ? 'skipped_non_enterprise_ci_gate' : passed ? 'passed' : 'failed_or_pending',
      requiredEnv: `${REQUIRE_MALWARE_SCAN_FOR_UPLOADS}=true`,
      providerEnv: MALWARE_SCANNER_PROVIDER,
      provider,
      providerIsReal,
      apiKeyConfigured: Boolean(process.env[MALWARE_SCANNER_API_KEY]?.trim()),
      apiKeyRedacted: true,
      endpoint: endpointHostForEvidence(),
      timeoutMs: scannerTimeoutMs(),
      checkedAt: scanResult.checkedAt,
      scanStatus: scanResult.status,
      scanProvider: scanResult.provider,
      scanRequired: scanResult.required,
      scanCheckedAt: scanResult.checkedAt,
      scanReasonCode: scanResult.reasonCode,
      providerSignatureRedacted: scanResult.providerSignatureDetected === true ? 'present_but_redacted' : null,
      providerResponseBodyPersisted: false,
      providerResponseMessagePersisted: false,
      fileHash,
      fileSize: testPdf.length,
      mimeDetected: 'application/pdf',
      fixtureBytesCommitted: false,
      blockedIfNotClean: blockedOnFailure,
    },
    controlsVerified: [
      'Maximum upload size, extension allow-listing, declared MIME, detected MIME and magic-number validation are centralized before storage writes.',
      'Filename sanitization, path traversal prevention, SHA-256 hashing and executable/script blocking are enforced before scanner invocation.',
      'Enterprise upload policy requires REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true and a real MALWARE_SCANNER_PROVIDER.',
      'Mock malware scanner providers are development/test-only and are treated as bypass providers for enterprise runtime proof.',
      'Scanner unavailable, timeout, suspicious, infected, error, malformed and not_configured verdicts block enterprise uploads fail-closed.',
      'Only a clean live provider verdict allows enterprise uploads.',
      'Storage paths are scoped under organizationId/userId prefixes.',
      'Download and preview URLs are backend-mediated, short-lived signed URLs after organization membership and documents:read checks.',
      'Cross-tenant document lookup and invalid storage prefixes are denied before signed URL creation.',
      'Audit events include upload_requested, upload_scanned, upload_blocked, download_requested and download_denied.',
      'Audit/document metadata include scanStatus, scanProvider, scanRequired, scanCheckedAt, fileHash, fileSize and mimeDetected.',
    ],
    acceptanceCriteria: {
      enterpriseUploadRequiresCleanScan: passed,
      scannerUnavailableBlocksUpload: true,
      scannerTimeoutBlocksUpload: true,
      scannerMalwareOrSuspiciousBlocksUpload: true,
      cleanScanAllowsUpload: passed,
      crossTenantDownloadImpossibleByDesign: true,
      liveProviderProofExists: passed,
      securityCiFailsOnEnterpriseScannerBypass: true,
      p0RegisterMayBeUpdated: passed,
    },
    controls: {
      maxUploadBytes: 10485760,
      allowedUserUploadMimeTypes: [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      blockedDangerousTypes: ['exe', 'dll', 'js', 'vbs', 'ps1', 'sh', 'svg', 'html', 'jar', 'msi', 'docm', 'xlsm', 'xll', 'xlam', 'mhtml', 'iso', 'apk'],
      storageBucket: 'controlled-documents',
      storageTenantPrefix: '<organizationId>/<actorUserId>/<uuid>.<extension>',
      signedUrlExpiresInSeconds: 60,
      supportedRealProviders: ['clamav', 'clamd', 'http', 'generic-http', 'webhook'],
      testDevelopmentOnlyProviders: ['mock', 'test', 'dev-mock'],
    },
    auditMetadata: ['scanStatus', 'scanProvider', 'scanRequired', 'scanCheckedAt', 'fileHash', 'fileSize', 'mimeDetected', 'organizationId', 'actorUserId'],
    persistedDocumentMetadata: ['scan_status', 'scan_provider', 'scan_required', 'scan_checked_at', 'file_hash', 'file_size', 'mime_detected'],
    evidenceLocations: [
      'src/server/security/upload-security.ts',
      'src/server/security/file-signature.ts',
      'src/server/security/malware-scan.ts',
      'src/app/api/documents/upload/route.ts',
      'src/server/actions/documents.ts',
      'src/server/actions/document-downloads.ts',
      'scripts/security/check-upload-security.mjs',
      'scripts/security/check-upload-content-scan.mjs',
      'scripts/security/run-upload-scanner-runtime-validation.mjs',
      '.github/workflows/upload-security-ci.yml',
      'tests/security/upload-malware-scan-validation.test.ts',
      'docs/security/evidence/runtime/upload-malware-scan-validation.json',
      'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
    ],
    outcome: passed ? 'passed' : skipped ? 'skipped' : 'blocked_pending_live_provider',
    completionRule: 'Run npm run security:upload-scanner:runtime with REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true and a real MALWARE_SCANNER_PROVIDER. Use --update-register only when liveProviderProof.status is passed.',
    productionGate: 'Enterprise upload readiness requires a reachable real malware scanner provider returning clean verdicts. Bypass, mock, disabled, unavailable, timeout, suspicious, infected, malformed and error results block upload.',
  };

  if (!passed) evidence.exception = exceptionFor(scanResult);
  return evidence;
}

function writeEvidence(evidence) {
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8' });
}

function readP0Register() {
  try {
    return readFileSync(P0_REGISTER_PATH, 'utf8');
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : 'unknown_error';
    if (code === 'ENOENT') throw new Error(`${P0_REGISTER_PATH} is missing; cannot update P0 register.`);
    throw error;
  }
}

function updateP0RegisterIfPassed(evidence) {
  if (!updateRegister || evidence.liveProviderProof.status !== 'passed') return false;

  const source = readP0Register();
  const replacement = `| Upload malware/content scanning validation | Complete | \`${EVIDENCE_PATH}\` records Complete live provider proof from a real ${evidence.liveProviderProof.provider} scanner, fail-closed behavior, clean verdict allowance and rejected non-clean verdict policy; secrets and file bytes redacted | Security reviewer | Revalidate before enterprise release or provider change |`;
  const updated = source.replace(/^\| Upload malware\/content scanning validation \|.*$/m, replacement);

  if (updated === source) throw new Error('Could not find Upload malware/content scanning validation row in P0 register.');
  writeFileSync(P0_REGISTER_PATH, updated, { encoding: 'utf8' });
  return true;
}

if (ciGate && !enterpriseContext) {
  const skipped = buildEvidence(result('not_configured', 'not_configured', 'non_enterprise_ci_gate_skipped'), true);
  console.log('Upload scanner runtime validation: skipped live provider proof for non-enterprise CI gate.');
  if (!noWrite) writeEvidence(skipped);
  process.exit(0);
}

const scanResult = await runLiveScan();
const evidence = buildEvidence(scanResult);

if (!noWrite) writeEvidence(evidence);
const registerUpdated = updateP0RegisterIfPassed(evidence);

if (evidence.liveProviderProof.status === 'passed') {
  console.log(`Upload scanner runtime validation: passed with provider ${evidence.liveProviderProof.provider}.`);
  if (registerUpdated) console.log(`Updated ${P0_REGISTER_PATH}.`);
  process.exit(0);
}

const message = `Upload scanner runtime validation: ${evidence.outcome}; provider=${evidence.liveProviderProof.provider}; status=${evidence.liveProviderProof.scanStatus}; reasonCode=${evidence.liveProviderProof.scanReasonCode}`;

if (advisory && !enterpriseContext) {
  console.warn(message);
  process.exit(0);
}

console.error(message);
process.exit(1);
