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

test('has no active npm vulnerability exceptions', () => {
  assert.deepEqual(NPM_AUDIT_EXCEPTIONS, []);
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
