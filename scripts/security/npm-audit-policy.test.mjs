import assert from 'node:assert/strict';
import test from 'node:test';
import { NPM_AUDIT_EXCEPTIONS, evaluateNpmAudit } from './npm-audit-policy.mjs';

function advisoryEvidence({
  packageName = 'unsafe-package',
  severity = 'high',
  source = 9999999,
  via,
} = {}) {
  const rootAdvisory = {
    source,
    name: packageName,
    severity,
    url: `https://github.com/advisories/GHSA-AAAA-BBBB-CCCC`,
  };
  return {
    audit: {
      vulnerabilities: {
        [packageName]: {
          severity,
          via: via ?? [rootAdvisory],
          nodes: [`node_modules/${packageName}`],
        },
      },
    },
    lockfile: {
      packages: {
        [`node_modules/${packageName}`]: {
          version: '1.0.0',
          integrity: `sha512-${'a'.repeat(86)}`,
        },
      },
    },
  };
}

test('has only the narrow temporary braces dev-only exception', () => {
  assert.equal(NPM_AUDIT_EXCEPTIONS.length, 1);
  assert.deepEqual(
    {
      id: NPM_AUDIT_EXCEPTIONS[0].id,
      packageName: NPM_AUDIT_EXCEPTIONS[0].packageName,
      version: NPM_AUDIT_EXCEPTIONS[0].version,
      devOnly: NPM_AUDIT_EXCEPTIONS[0].devOnly,
      expiresAt: NPM_AUDIT_EXCEPTIONS[0].expiresAt,
    },
    {
      id: 'GHSA-vfj7-8cjw-p6xm',
      packageName: 'braces',
      version: '3.0.3',
      devOnly: true,
      expiresAt: '2026-10-17T23:59:59.000Z',
    },
  );
});

test('accepts a clean npm audit without exceptions', () => {
  const result = evaluateNpmAudit({
    audit: { vulnerabilities: {} },
    lockfile: { packages: {} },
    now: new Date('2026-08-04T12:00:00.000Z'),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.appliedExceptions, []);
});

test('rejects every moderate-or-higher advisory when no exception exists', () => {
  for (const severity of ['moderate', 'high', 'critical']) {
    const result = evaluateNpmAudit({
      ...advisoryEvidence({ severity }),
      now: new Date('2026-08-04T12:00:00.000Z'),
    });

    assert.equal(result.ok, false);
    assert.match(result.failures.join('\n'), /unapproved advisory/);
    assert.deepEqual(result.appliedExceptions, []);
  }
});

test('ignores info and low findings according to the moderate release threshold', () => {
  for (const severity of ['info', 'low']) {
    const result = evaluateNpmAudit({
      ...advisoryEvidence({ severity }),
      now: new Date('2026-08-04T12:00:00.000Z'),
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
  }
});

test('rejects missing transitive advisory references and dependency cycles', () => {
  const missing = evaluateNpmAudit({
    audit: {
      vulnerabilities: {
        parent: {
          severity: 'high',
          via: ['missing-child'],
          nodes: ['node_modules/parent'],
        },
      },
    },
    lockfile: { packages: {} },
  });
  const cycle = evaluateNpmAudit({
    audit: {
      vulnerabilities: {
        parent: {
          severity: 'high',
          via: ['child'],
          nodes: ['node_modules/parent'],
        },
        child: {
          severity: 'high',
          via: ['parent'],
          nodes: ['node_modules/child'],
        },
      },
    },
    lockfile: { packages: {} },
  });

  assert.equal(missing.ok, false);
  assert.match(missing.failures.join('\n'), /references missing vulnerability/);
  assert.equal(cycle.ok, false);
  assert.match(cycle.failures.join('\n'), /dependency cycle/);
});


test('accepts the exact temporary braces advisory only when the locked artifact is dev-only', () => {
  const exception = NPM_AUDIT_EXCEPTIONS[0];
  const advisory = {
    source: 1234567,
    name: exception.packageName,
    severity: 'high',
    url: `https://github.com/advisories/${exception.id}`,
  };
  const makeEvidence = (dev) => ({
    audit: {
      vulnerabilities: {
        braces: {
          severity: 'high',
          via: [advisory],
          nodes: ['node_modules/braces'],
        },
      },
    },
    lockfile: {
      packages: {
        'node_modules/braces': {
          version: exception.version,
          integrity: exception.integrity,
          dev,
        },
      },
    },
  });

  const accepted = evaluateNpmAudit({
    ...makeEvidence(true),
    now: new Date('2026-10-03T22:00:00.000Z'),
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.appliedExceptions.length, 1);

  const rejected = evaluateNpmAudit({
    ...makeEvidence(false),
    now: new Date('2026-10-03T22:00:00.000Z'),
  });
  assert.equal(rejected.ok, false);
  assert.match(rejected.failures.join('\n'), /not dev-only/);
});
