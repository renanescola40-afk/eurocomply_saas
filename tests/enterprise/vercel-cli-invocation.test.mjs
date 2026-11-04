import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildVercelCliInvocation } from '../../scripts/release/vercel-cli-invocation.mjs';

const token = 'deliberately-invalid-fixture-token';
const url = 'https://example-deployment.vercel.app/';
const version = '56.3.2';

for (const operation of ['rollback', 'promote']) {
  test(`${operation} uses environment authentication without leaking a token in argv`, () => {
    const invocation = buildVercelCliInvocation({
      args: [operation, url], token, version,
      env: { NODE_ENV: 'test', VERCEL_TOKEN: 'previous-value' },
    });
    assert.equal(invocation.command, 'npx');
    assert.deepEqual(invocation.argv, ['--yes', 'vercel@56.3.2', operation, url, '--yes']);
    assert.equal(invocation.options.env.VERCEL_TOKEN, token);
    assert.equal(invocation.options.env.NODE_ENV, 'test');
    assert.equal(invocation.argv.includes(token), false);
    assert.equal(invocation.argv.includes('--token'), false);
    assert.deepEqual(invocation.options.stdio, ['ignore', 'pipe', 'pipe']);
  });
}

test('fails closed when authentication is missing or command/version is not approved', () => {
  const invoke = (patch = {}) => buildVercelCliInvocation({ args: ['rollback', url], token, version, ...patch });
  for (const badToken of ['', ' ', null, undefined]) {
    assert.throws(() => invoke({ token: badToken }), /vercel_token_missing/);
  }
  for (const badArgs of [['deploy', url], ['promote', url, '--token', token], ['rollback'], []]) {
    assert.throws(() => invoke({ args: badArgs }), /unsupported_vercel_rollback_operation/);
  }
  for (const badVersion of ['latest', '56.3.2 --token leaked', '', 56]) {
    assert.throws(() => invoke({ version: badVersion }), /vercel_cli_version_not_pinned/);
  }
});

test('rejects unsafe deployment URLs without launching a process', () => {
  for (const badUrl of [
    'http://example-deployment.vercel.app/',
    'https://vercel.app/',
    'https://example-deployment.vercel.app/path',
    'https://example-deployment.vercel.app/?token=leak',
    'https://example-deployment.vercel.app/#fragment',
    'https://example-deployment.vercel.app:444/',
    'https://user:password@example-deployment.vercel.app/',
    'https://example.invalid/',
    '--token',
  ]) {
    assert.throws(() => buildVercelCliInvocation({ args: ['rollback', badUrl], token, version }), /invalid_vercel_deployment_url/);
  }
});
