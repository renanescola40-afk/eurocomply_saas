import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-migration-reconciliation-decision-gate.yml', 'utf8');
const builder = readFileSync('scripts/supabase/build-bounded-migration-reconciliation-inventory.mjs', 'utf8');
const verifier = readFileSync('scripts/supabase/verify-forward-human-approval.mjs', 'utf8');

describe('bounded Supabase migration human decision gate', () => {
  it('requires successful exact-SHA bounded S3 plus successful S2 provenance', () => {
    expect(workflow).toContain('source_run_id:');
    expect(workflow).toContain('forward_dry_run_run_id:');
    expect(workflow).toContain(".github/workflows/supabase-production-migration-dry-run.yml");
    expect(workflow).toContain(".github/workflows/supabase-forward-reconciliation-dry-run.yml");
    expect(workflow).toContain(`test "$(jq -r '.conclusion' <<<"$RUN_JSON")" = 'success'`);
    expect(workflow).toContain(`test "$(jq -r '.conclusion' <<<"$FORWARD_JSON")" = 'success'`);
    expect(workflow).toContain('bounded-production-dry-run-attestation.json');
    expect(workflow).toContain('.mode == "BOUNDED_FORWARD_DECISION"');
    expect(workflow).toContain('.checks.filteredDbPushDryRunOnly == true');
    expect(workflow).toContain('.checks.pendingSetEqualsSelectedSet == true');
    expect(workflow).toContain('.checks.unauthorizedPendingMigrations == false');
    expect(workflow).toContain('.productionWriteAuthorized == false');
    expect(workflow).toContain('.productionWritePerformed == false');
  });

  it('binds the production inventory to the exact successful forward manifest', () => {
    expect(workflow).toContain('build-bounded-migration-reconciliation-inventory.mjs');
    expect(workflow).toContain('bounded-migration-reconciliation-inventory.json');
    expect(builder).toContain('selected migration is absent from production dry-run inventory');
    expect(builder).toContain('MAX_BOUNDED_MIGRATIONS = 32');
    expect(builder).toContain('exactFilenameAndSha256Bound: true');
    expect(builder).toContain('automaticClassificationPerformed: false');
    expect(builder).toContain('productionWriteAuthorized: false');
    expect(workflow).toContain(`SELECTED_COUNT="$(jq '.migrations | length' "\${FORWARD_MANIFESTS[0]}")"`);
    expect(workflow).toContain(`test "$(jq '.items | length' "$BOUNDED_INVENTORY")" -eq "$SELECTED_COUNT"`);
    expect(workflow).toContain('test "$SELECTED_COUNT" -le 32');
    expect(workflow).not.toContain(`test "$(jq '.items | length' "$BOUNDED_INVENTORY")" -le 25`);
  });

  it('requires a fresh human decision on the exact unchanged current main SHA', () => {
    expect(workflow).toContain('test "$CURRENT_SHA" = "$SUBJECT_SHA"');
    expect(workflow).toContain('decision_payload_b64:');
    expect(workflow).toContain("printf '%s' \"$DECISION_PAYLOAD_B64\" | base64 --decode");
    expect(workflow).toContain('No exact-SHA bounded human decision payload was supplied.');
    expect(verifier).toContain('decision subject SHA must equal target SHA; byte equivalence cannot transfer human approval');
    expect(verifier).toContain('decisionSubjectEqualsTargetSha: true');
  });

  it('accepts only a fully reviewed bounded PENDING_DEPLOYMENT set and never authorizes production', () => {
    expect(workflow).toContain('.counts.PENDING_DEPLOYMENT == $count');
    expect(workflow).toContain('.deploymentAuthorization == "NOT_AUTHORIZED"');
    expect(workflow).toContain('environment: supabase-production-migration-review');
    expect(workflow).toContain("echo '- Production write authorized: no'");
    expect(workflow).not.toContain('--include-all');
    expect(workflow).not.toContain('migration repair --');
    expect(workflow).not.toMatch(/supabase\s+db\s+push/);
  });
});
