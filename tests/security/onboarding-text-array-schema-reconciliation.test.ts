import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const schemaSource = fs.readFileSync(
  'supabase/migrations/20260903114400_reconcile_ai_system_text_array_schema.sql',
  'utf8',
);
const rpcSource = fs.readFileSync(
  'supabase/migrations/20260903114500_reconcile_onboarding_atomic_text_arrays.sql',
  'utf8',
);

describe('onboarding text[] schema reconciliation', () => {
  it('accepts only the historical jsonb or canonical text[] source schemas', () => {
    expect(schemaSource).toContain("obligations_type not in ('jsonb', 'text[]')");
    expect(schemaSource).toContain("next_actions_type not in ('jsonb', 'text[]')");
  });

  it('fails closed before converting malformed historical jsonb values', () => {
    expect(schemaSource).toContain("jsonb_typeof(systems.obligations) <> 'array'");
    expect(schemaSource).toContain("jsonb_typeof(systems.next_actions) <> 'array'");
    expect(schemaSource).toContain("jsonb_typeof(element.value) <> 'string'");
    expect(schemaSource).toContain('contains non-array or non-string JSON values');
  });

  it('converts historical jsonb arrays to text[] while preserving order and duplicates', () => {
    expect(schemaSource).toContain('jsonb_array_elements_text(p_value)');
    expect(schemaSource).toContain('array_agg(element.value order by element.ordinality)');
    expect(schemaSource).toContain('alter column obligations type text[]');
    expect(schemaSource).toContain('alter column next_actions type text[]');
    expect(schemaSource).toContain(
      'using public.__risck_jsonb_string_array_to_text_array(obligations)',
    );
    expect(schemaSource).toContain(
      'using public.__risck_jsonb_string_array_to_text_array(next_actions)',
    );
  });

  it('is a no-op for already-canonical Production column types apart from canonical defaults', () => {
    expect(schemaSource).toContain("if obligations_type = 'jsonb' then");
    expect(schemaSource).toContain("if next_actions_type = 'jsonb' then");
    expect(schemaSource).toContain("alter column obligations set default '{}'::text[]");
    expect(schemaSource).toContain("alter column next_actions set default '{}'::text[]");
  });

  it('removes the temporary converter and verifies the canonical schema before the RPC repair', () => {
    expect(schemaSource).toContain(
      'drop function public.__risck_jsonb_string_array_to_text_array(jsonb)',
    );
    expect(schemaSource).toContain("obligations_type is distinct from 'text[]'");
    expect(schemaSource).toContain("next_actions_type is distinct from 'text[]'");
    expect(rpcSource).toContain("obligations_type is distinct from 'text[]'");
    expect(rpcSource).toContain("next_actions_type is distinct from 'text[]'");
  });

  it('does not rewrite migration history or disable row-level security', () => {
    expect(schemaSource).not.toContain('schema_migrations');
    expect(schemaSource).not.toContain('disable row level security');
    expect(schemaSource).not.toContain('alter migration');
  });
});
