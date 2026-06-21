import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('upload audit redaction', () => {
  it('does not place raw storage paths in upload audit metadata', () => {
    const source = readFileSync(join(process.cwd(), 'src/server/actions/documents.ts'), 'utf8');

    expect(source).toContain('function withoutRawStoragePath');
    expect(source).toContain('delete safeMetadata.storagePath');
    expect(source).toContain('hasStoragePath: true');
    expect(source).toContain('storagePathTenantPrefixValidated: true');
    expect(source).not.toContain('...scanMetadata,\n      storagePath,');
    expect(source).not.toContain('metadata: { name: payload.name, category: payload.category, ...(payload.metadata ?? {}) }');
  });
});
