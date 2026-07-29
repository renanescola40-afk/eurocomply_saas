import assert from 'node:assert/strict';
import test from 'node:test';
import { NPM_AUDIT_EXCEPTIONS, evaluateNpmAudit } from './npm-audit-policy.mjs';

const exception = NPM_AUDIT_EXCEPTIONS[0];
const affectedNode = 'node_modules/brace-expansion';

function evidence({ advisorySource = exception.source, version = exception.version } = {}) {
  return {
    audit: {
      vulnerabilities: {
        'brace-expansion': {
          severity: 'high',
          via: [
            {
              source: advisorySource,
              name: 'brace-expansion',
              url: `https://github.com/advisories/${exception.id}`,
            },
          ],
          nodes: [affectedNode],
        },
        minimatch: {
          severity: 'high',
          via: ['brace-expansion'],
          nodes: ['node_modules/minimatch'],
        },
      },
    },
    lockfile: {
      packages: {
        [affectedNode]: {
          version,
          integrity: exception.integrity,
        },
      },
    },
  };
}

test('accepts only the reviewed brace-expansion backport before expiry', () => {
  const result = evaluateNpmAudit({
    ...evidence(),
    now: new Date('2026-07-29T12:00:00.000Z'),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.appliedExceptions.map(({ id }) => id), [exception.id]);
});

test('rejects any unapproved advisory', () => {
  const result = evaluateNpmAudit({
    ...evidence({ advisorySource: 9999999 }),
    now: new Date('2026-07-29T12:00:00.000Z'),
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join('\n'), /unapproved advisory/);
});

test('rejects artifact drift and expiration', () => {
  const drift = evaluateNpmAudit({
    ...evidence({ version: '1.1.16' }),
    now: new Date('2026-07-29T12:00:00.000Z'),
  });
  const expired = evaluateNpmAudit({
    ...evidence(),
    now: new Date('2026-08-06T00:00:00.000Z'),
  });

  assert.equal(drift.ok, false);
  assert.match(drift.failures.join('\n'), /allows only 1\.1\.17/);
  assert.equal(expired.ok, false);
  assert.match(expired.failures.join('\n'), /expired/);
});
