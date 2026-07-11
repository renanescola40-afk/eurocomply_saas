function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateObservabilityRuntimeEvidence(
  evidence,
  { now = new Date(), maxAgeDays = 7 } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.evidenceItem !== 'observability-smoke-validation') {
    failures.push('evidenceItem must be observability-smoke-validation');
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

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    else if (expiresAt < nowMs) failures.push('observability exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (!['production', 'enterprise'].includes(evidence?.releaseTarget)) {
    failures.push('releaseTarget must be production or enterprise');
  }
  if (evidence?.runtimeConfiguration?.targetCount < 1) {
    failures.push('runtimeConfiguration.targetCount must be at least 1');
  }
  if (evidence?.runtimeConfiguration?.sentryDsnConfigured !== true) {
    failures.push('runtimeConfiguration.sentryDsnConfigured must be true');
  }
  if (evidence?.runtimeConfiguration?.authenticatedSmokeEmissionEnabled !== true) {
    failures.push('runtimeConfiguration.authenticatedSmokeEmissionEnabled must be true');
  }
  if (evidence?.runtimeConfiguration?.hasProtectedReadinessToken !== true) {
    failures.push('runtimeConfiguration.hasProtectedReadinessToken must be true');
  }

  const globalChecks = evidence?.globalChecks ?? [];
  if (!Array.isArray(globalChecks) || globalChecks.length === 0) {
    failures.push('globalChecks must contain runtime checks');
  } else {
    for (const check of globalChecks) {
      if (check?.critical === true && check?.passed !== true) {
        failures.push(`critical global check ${check?.name ?? '<unknown>'} must pass`);
      }
    }
  }

  const targets = evidence?.targets ?? [];
  if (!Array.isArray(targets) || targets.length === 0) {
    failures.push('targets must contain at least one deployed target');
  } else {
    for (const target of targets) {
      if (target?.passed !== true) failures.push('every observability target must pass');
      const checks = target?.checks ?? [];
      for (const check of checks) {
        if (check?.critical === true && check?.passed !== true) {
          failures.push(`critical target check ${check?.name ?? '<unknown>'} must pass`);
        }
      }
      const sentCheck = checks.find((check) => check?.name === 'observabilitySmokeEventSent');
      if (sentCheck?.passed !== true) failures.push('observabilitySmokeEventSent must pass');
    }
  }

  if (Array.isArray(evidence?.failures) && evidence.failures.length > 0) {
    failures.push('failures must be empty');
  }
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) {
    failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  }
  if (evidence?.evidenceIntegrity?.authorizationHeaderStored !== false) {
    failures.push('evidenceIntegrity.authorizationHeaderStored must be false');
  }
  if (evidence?.evidenceIntegrity?.cookiesStored !== false) {
    failures.push('evidenceIntegrity.cookiesStored must be false');
  }

  return failures;
}
