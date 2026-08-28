import assert from 'node:assert/strict';
import test from 'node:test';

import { validatorFailureDiagnostic } from '../../scripts/recovery/verify-supabase-provider-managed-restore.mjs';

test('surfaces only a reviewed validator assertion marker from a provider error', () => {
  const validatorSql = `
    do $verify$
    begin
      raise exception 'Enterprise control-plane tables missing: %', 2;
    end
    $verify$;
  `;
  const response = JSON.stringify({
    message: 'Failed to run sql query: ERROR: Enterprise control-plane tables missing: 2',
  });

  assert.equal(
    validatorFailureDiagnostic(response, validatorSql),
    'validator_enterprise_control_plane_tables_missing',
  );
});

test('does not surface unreviewed provider response text', () => {
  const validatorSql = `raise exception 'Reviewed schema invariant failed';`;
  const response = JSON.stringify({
    message: 'customer@example.com secret-value unexpected failure',
  });

  assert.equal(validatorFailureDiagnostic(response, validatorSql), null);
});

test('matches the static prefix of parameterized reviewed assertions without retaining dynamic values', () => {
  const validatorSql = `raise exception 'Missing reviewed policies: %', missing_count;`;
  const response = JSON.stringify({
    message: 'ERROR: Missing reviewed policies: 17',
  });

  assert.equal(
    validatorFailureDiagnostic(response, validatorSql),
    'validator_missing_reviewed_policies',
  );
});
