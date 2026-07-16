import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  'src/app/[locale]/ai-systems/[id]/ai-system-edit-form.tsx',
  'utf8',
);

describe('AI reassessment accessible names', () => {
  it('does not rely on placeholders alone for editable text fields', () => {
    for (const label of [
      'System name',
      'Owner team',
      'Category',
      'Country or market',
      'Vendor',
      'Model',
      'Data processed',
      'Use case',
    ]) {
      expect(source).toContain(`aria-label="${label}"`);
    }
  });

  it('names workflow fields from their localized copy', () => {
    for (const label of ['t.packName', 't.vendorName', 't.vendorNotes', 't.dueDate', 't.riskNotes']) {
      expect(source).toContain(`aria-label={${label}}`);
    }
  });
});
