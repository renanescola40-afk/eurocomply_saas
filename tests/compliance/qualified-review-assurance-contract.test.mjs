import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = JSON.parse(fs.readFileSync('docs/compliance/evidence/qualified-review-campaign-registry.json','utf8'));
const validator = fs.readFileSync('scripts/compliance/validate-qualified-review-campaign.mjs','utf8');

test('campaign registry has unique requirements and positive weights', () => {
  assert.equal(new Set(registry.requirements.map(r=>r.id)).size, registry.requirements.length);
  assert.ok(registry.requirements.length >= 8);
  assert.ok(registry.requirements.every(r=>r.weight > 0));
});

test('validator is exact-SHA and fail-closed', () => {
  assert.match(validator, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(validator, /placeholder_content/);
  assert.match(validator, /independence_not_proven/);
  assert.match(validator, /review_expired/);
  assert.match(validator, /QUALIFIED_REVIEW_NO_GO/);
});
