import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/supabase-live-schema-evidence.yml', 'utf8');
const builder = readFileSync('scripts/supabase/migration-object-evidence-core.mjs', 'utf8');

test('live schema workflow feeds the comprehensive catalog contract to the builder', () => {
  assert.match(workflow, /--file scripts\/supabase\/production-schema-evidence\.sql/);
  assert.match(workflow, /> "\$OUTPUT_DIR\/catalog\.txt"/);
  assert.match(workflow, /grep -q '\^table\|public\|'/);
  assert.match(workflow, /grep -q '\^migration\|'/);
  assert.match(workflow, /catalog_capability\|persistent_object_grants_v1/);
  assert.match(builder, /catalog does not contain the required table and migration evidence sections/);
  assert.match(builder, /persistent object and function grant capabilities/);
});

test('live schema workflow passes all positional builder arguments in the correct order', () => {
  const command = workflow.slice(workflow.indexOf('node scripts/supabase/build-migration-object-evidence.mjs'));
  assert.match(command, /"\$INVENTORY"[\s\\]+"\$OUTPUT_DIR\/catalog\.txt"[\s\\]+"supabase\/migrations"[\s\\]+"\$OUTPUT_DIR"/);
  assert.match(command, /--target-sha=\$TARGET_SHA/);
  assert.match(command, /--dry-run-id=\$SOURCE_RUN_ID/);
  assert.match(command, /--schema-evidence-run-id=\$GITHUB_RUN_ID/);
});

test('live schema workflow uses the canonical validated Supabase pooler binding', () => {
  assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_POOLER_URL \}\}/);
  assert.match(workflow, /SUPABASE_PROJECT_ID: \$\{\{ secrets\.SUPABASE_PROJECT_ID \}\}/);
  assert.doesNotMatch(workflow, /secrets\.SUPABASE_DB_URL(?:\s|\}|$)/);
  assert.match(workflow, /prepare-production-db-connection\.mjs/);
  assert.match(workflow, /SUPABASE_DB_URL_FILE/);
  assert.match(workflow, /stat -c '%a' "\$DB_URL_FILE"/);
  assert.match(workflow, /= '600'/);
  assert.match(workflow, /DB_URL="\$\(cat "\$SUPABASE_DB_URL_FILE"\)"/);
});

test('live schema capture remains read only', () => {
  const sql = readFileSync('scripts/supabase/production-schema-evidence.sql', 'utf8');
  assert.match(sql, /begin transaction read only;/i);
  assert.match(sql, /rollback;/i);
  assert.doesNotMatch(workflow, /supabase db push|psql[^\n]+-c\s+["']?(?:insert|update|delete|alter|create|drop)\b/i);
});
