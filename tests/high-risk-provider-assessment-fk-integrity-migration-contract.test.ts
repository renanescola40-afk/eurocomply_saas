import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260721190100_high_risk_provider_assessment_fk_integrity.sql',
  ),
  'utf8',
);

describe('provider mitigation assessment FK integrity migration', () => {
  it('discovers and removes the unsafe composite foreign key', () => {
    expect(migration).toContain("table_record.relname = 'ai_provider_dataset_mitigations'");
    expect(migration).toContain("constraint_record.contype = 'f'");
    expect(migration).toContain(
      'FOREIGN KEY (organization_id, program_id, dataset_id, assessment_id)%',
    );
    expect(migration).toContain('drop constraint %I');
  });

  it('installs one named organization-program-dataset-assessment reference', () => {
    expect(migration).toContain(
      'add constraint ai_provider_dataset_mitigations_assessment_fk',
    );
    expect(migration).toMatch(
      /foreign key \(organization_id, program_id, dataset_id, assessment_id\)[\s\S]*references public\.ai_provider_dataset_assessments/,
    );
  });

  it('prevents deletion from nulling mandatory tenant and dataset columns', () => {
    expect(migration).toContain('on delete restrict');
    expect(migration).not.toContain('on delete set null');
  });
});
