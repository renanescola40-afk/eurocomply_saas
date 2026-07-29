const SEVERITY_RANK = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export const NPM_AUDIT_EXCEPTIONS = [
  {
    id: 'GHSA-mh99-v99m-4gvg',
    source: 1124334,
    packageName: 'brace-expansion',
    version: '1.1.17',
    integrity: 'sha512-w+aeW/mkgM4PyRMOJCgi3fOrTm5Q8QY1OSfn2TO2iuDj3ezIHqejmuxbjfPrqUkgqRew1iqkyAn0tr0ZwHD9+w==',
    expiresAt: '2026-08-05T23:59:59.000Z',
  },
];

function collectAdvisories(packageName, vulnerabilities, visited = new Set()) {
  if (visited.has(packageName)) {
    throw new Error(`npm audit dependency cycle detected at ${packageName}`);
  }

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) {
    throw new Error(`npm audit references missing vulnerability ${packageName}`);
  }

  const nextVisited = new Set(visited);
  nextVisited.add(packageName);
  const advisories = [];

  for (const via of vulnerability.via ?? []) {
    if (typeof via === 'string') {
      advisories.push(...collectAdvisories(via, vulnerabilities, nextVisited));
    } else {
      advisories.push(via);
    }
  }

  return advisories;
}

function matchingException(advisory) {
  return NPM_AUDIT_EXCEPTIONS.find(
    (exception) =>
      advisory.source === exception.source &&
      advisory.name === exception.packageName &&
      advisory.url === `https://github.com/advisories/${exception.id}`,
  );
}

function validateLockedPackage(exception, lockfile, nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return `${exception.packageName} advisory has no affected lockfile nodes`;
  }

  for (const node of nodes) {
    const locked = lockfile.packages?.[node];
    if (!locked) return `${node} is absent from package-lock.json`;
    if (locked.version !== exception.version) {
      return `${node} is ${locked.version}; exception allows only ${exception.version}`;
    }
    if (locked.integrity !== exception.integrity) {
      return `${node} integrity does not match the reviewed ${exception.version} artifact`;
    }
  }

  return null;
}

export function evaluateNpmAudit({ audit, lockfile, now = new Date() }) {
  const failures = [];
  const appliedExceptions = new Map();
  const vulnerabilities = audit?.vulnerabilities ?? {};

  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    if ((SEVERITY_RANK[vulnerability.severity] ?? Number.POSITIVE_INFINITY) < SEVERITY_RANK.moderate) {
      continue;
    }

    let advisories;
    try {
      advisories = collectAdvisories(packageName, vulnerabilities);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    if (advisories.length === 0) {
      failures.push(`${packageName} has no traceable root advisory`);
      continue;
    }

    for (const advisory of advisories) {
      const exception = matchingException(advisory);
      if (!exception) {
        failures.push(
          `${packageName} is affected by unapproved advisory ${advisory.url ?? advisory.source ?? 'unknown'}`,
        );
        continue;
      }

      if (now.getTime() > Date.parse(exception.expiresAt)) {
        failures.push(`${exception.id} metadata exception expired at ${exception.expiresAt}`);
        continue;
      }

      const rootVulnerability = vulnerabilities[exception.packageName];
      const lockFailure = validateLockedPackage(exception, lockfile, rootVulnerability?.nodes);
      if (lockFailure) {
        failures.push(lockFailure);
        continue;
      }

      appliedExceptions.set(exception.id, exception);
    }
  }

  return {
    ok: failures.length === 0,
    failures: [...new Set(failures)],
    appliedExceptions: [...appliedExceptions.values()],
  };
}
