const SEVERITY_RANK = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

// Exceptions must be narrow, exact-artifact-bound, owner-reviewed and short-lived.
// GHSA-vfj7-8cjw-p6xm currently has no patched braces release. The affected
// installation is transitive lint/build tooling only and is absent from the
// production dependency set. Re-evaluate immediately when upstream ships a patch.
export const NPM_AUDIT_EXCEPTIONS = [
  {
    source: null,
    id: 'GHSA-vfj7-8cjw-p6xm',
    packageName: 'braces',
    version: '3.0.3',
    integrity: 'sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==',
    devOnly: true,
    expiresAt: '2026-10-17T23:59:59.000Z',
    reason: 'Unpatched upstream advisory in eslint-config-next lint tooling; exact locked artifact is dev-only and not shipped in the production dependency set.',
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
      (exception.source == null || advisory.source === exception.source) &&
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
    if (exception.devOnly === true && locked.dev !== true) {
      return `${node} is not dev-only; the temporary exception cannot cover a production dependency`;
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
