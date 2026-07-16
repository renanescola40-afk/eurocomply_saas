import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  'src/app/[locale]/ai-systems/[id]/ai-system-edit-form.tsx',
  'utf8',
);
const copy = fs.readFileSync(
  'src/app/[locale]/ai-systems/[id]/ai-system-edit-copy.ts',
  'utf8',
);

describe('AI reassessment network resilience', () => {
  it('always releases save state after request rejection', () => {
    expect(source).toContain('} catch {');
    expect(source).toContain('} finally {\n      setIsSaving(false);');
    expect(source).toContain('} finally {\n      setIsWorkflowSaving(false);');
    expect(source).not.toContain('const payload = await response.json().catch(() => ({}));\n    setIsSaving(false);');
  });

  it('announces localized success and failure notices to assistive technology', () => {
    expect(copy).toContain("saveSuccess: 'System reassessed and saved.'");
    expect(copy).toContain("saveError: 'Could not save reassessment.'");
    expect(source).toContain("role={notice.type === 'error' ? 'alert' : 'status'}");
    expect(source).toContain("role={workflowNotice.type === 'error' ? 'alert' : 'status'}");
    expect(source).toContain('aria-live="polite"');
  });
});
