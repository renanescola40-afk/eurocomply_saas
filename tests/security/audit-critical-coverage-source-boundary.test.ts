import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkerPath = 'scripts/security/check-audit-critical-coverage.mjs';

describe('audit critical coverage source boundary', () => {
  it('does not count the central AuditAction declaration as production emission coverage', () => {
    const checker = readFileSync(checkerPath, 'utf8');

    expect(checker).toContain("const auditLog = read(auditLogPath);");
    expect(checker).toContain(
      "const productionAuditSources = [serverActionAudit, ...criticalSourceFiles.map(read)].join('\\n');",
    );
    expect(checker).not.toContain(
      "const productionAuditSources = [auditLog, serverActionAudit, ...criticalSourceFiles.map(read)].join('\\n');",
    );
  });
});
