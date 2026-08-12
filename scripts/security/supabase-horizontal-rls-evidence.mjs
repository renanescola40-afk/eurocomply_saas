export const requiredHorizontalIsolationOperations = {
  monitoring_preferences: [
    'horizontal_other_user_read_denied',
    'horizontal_other_user_update_denied',
    'horizontal_other_user_delete_denied',
    'horizontal_self_insert_allowed',
    'horizontal_self_read_allowed',
  ],
  notifications: [
    'horizontal_recipient_read_allowed',
    'horizontal_other_user_read_denied',
    'horizontal_other_user_update_denied',
    'horizontal_other_user_delete_denied',
    'horizontal_authenticated_insert_denied',
  ],
  onboarding_activation_runs: [
    'horizontal_member_read_allowed',
    'horizontal_member_insert_denied',
    'horizontal_member_update_denied',
    'horizontal_member_delete_denied',
  ],
};

export function validateHorizontalIsolationEvidence(evidence) {
  const errors = [];
  const tests = Array.isArray(evidence?.testCases) ? evidence.testCases : [];

  for (const [table, operations] of Object.entries(requiredHorizontalIsolationOperations)) {
    for (const operation of operations) {
      const matching = tests.find((test) => test?.table === table && test?.operation === operation);
      if (!matching) {
        errors.push(`missing horizontal RLS operation coverage: ${table}:${operation}`);
      } else if (matching.passed !== true) {
        errors.push(`horizontal RLS operation failed: ${table}:${operation}`);
      }
    }
  }

  if (evidence?.horizontalIsolation?.status !== 'passed') {
    errors.push('horizontal isolation status must be passed');
  }

  if (evidence?.horizontalIsolation?.sameTenantDistinctUsers !== true) {
    errors.push('horizontal isolation must prove distinct users inside the same tenant');
  }

  return { valid: errors.length === 0, errors };
}
