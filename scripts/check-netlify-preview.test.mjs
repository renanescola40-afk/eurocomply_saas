import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNetlifyPreview } from './check-netlify-preview.mjs';

test('Netlify Production and branch deployments fail without any QA configuration', () => {
  for (const context of ['production', 'branch-deploy']) {
    assert.ok(validateNetlifyPreview({ NETLIFY: 'true', CONTEXT: context }).errors.length);
  }
});

test('a deploy preview without explicit QA setup fails closed', () => {
  assert.ok(validateNetlifyPreview({ NETLIFY: 'true', CONTEXT: 'deploy-preview' }).errors.length);
});

test('a spoofed Netlify context without platform marker fails closed', () => {
  assert.ok(validateNetlifyPreview({ CONTEXT: 'deploy-preview' }).errors.length);
});
