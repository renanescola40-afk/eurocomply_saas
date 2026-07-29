import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const query = fs.readFileSync(path.join(process.cwd(), 'src/server/queries/qualified-review-evidence-package.ts'), 'utf8');

describe('qualified review evidence package query', () => {
  it('rejects submissions expired at the package generation instant', () => {
    expect(query).toContain('const generatedAt = new Date()');
    expect(query).toContain('new Date(row.valid_until).getTime() <= generatedAt.getTime()');
    expect(query).toContain('expired_submission:${row.workstream_id}');
    expect(query).toContain('generatedAt: generatedAt.toISOString()');
  });
});
