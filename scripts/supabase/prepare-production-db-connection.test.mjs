import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  inspectProductionDbUrlInput,
  normalizeProductionDbUrl,
  writeProtectedConnectionFile,
} from './prepare-production-db-connection.mjs';

const projectRef = 'abcdefghijklmnopqrst';
const password = 'StrongPassword123456789';

function sessionPoolerUrl(overrides = {}) {
  const ref = overrides.ref ?? projectRef;
  const host = overrides.host ?? 'aws-0-eu-west-1.pooler.supabase.com';
  const port = overrides.port ?? '5432';
  return `postgresql://postgres.${ref}:${password}@${host}:${port}/postgres?sslmode=require`;
}

describe('prepare production Supabase database connection', () => {
  it('accepts a matching session pooler URL and returns non-secret diagnostics', () => {
    const result = normalizeProductionDbUrl(sessionPoolerUrl(), projectRef);

    expect(result.url).toContain(`postgres.${projectRef}`);
    expect(result.diagnostics).toEqual({
      status: 'ready',
      transport: 'session_pooler',
      host: 'aws-0-eu-west-1.pooler.supabase.com',
      port: '5432',
      database: 'postgres',
      projectRefSuffix: 'opqrst',
      trimmedOuterWhitespace: false,
      removedLineBreakCount: 0,
    });
    expect(JSON.stringify(result.diagnostics)).not.toContain(password);
    expect(JSON.stringify(result.diagnostics)).not.toContain(projectRef);
  });

  it('accepts transaction pooler and direct Supabase URLs', () => {
    const transaction = normalizeProductionDbUrl(
      sessionPoolerUrl({ port: '6543' }),
      projectRef,
    );
    const direct = normalizeProductionDbUrl(
      `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`,
      projectRef,
    );

    expect(transaction.diagnostics.transport).toBe('transaction_pooler');
    expect(direct.diagnostics.transport).toBe('direct');
  });

  it('normalizes outer whitespace and line breaks introduced by secret editors', () => {
    const source = sessionPoolerUrl();
    const multiline = `  ${source.replace('@', ' \r\n @')}\r\n`;
    const result = normalizeProductionDbUrl(multiline, projectRef);

    expect(result.url).toBe(source);
    expect(result.diagnostics.trimmedOuterWhitespace).toBe(true);
    expect(result.diagnostics.removedLineBreakCount).toBe(2);
  });

  it('keeps strict URL validation after multiline normalization', () => {
    const malicious = sessionPoolerUrl({ host: 'attacker.example.com' }).replace(
      '@',
      '\n@',
    );

    expect(() => normalizeProductionDbUrl(malicious, projectRef)).toThrow(
      'not an approved Supabase database endpoint',
    );
    expect(() =>
      normalizeProductionDbUrl(sessionPoolerUrl().replace(':5432', ' :5432'), projectRef),
    ).toThrow('contains literal whitespace');
  });

  it('reports safe input diagnostics without exposing credentials', () => {
    const multiline = sessionPoolerUrl().replace('@', '\n@');
    const diagnostics = inspectProductionDbUrlInput(multiline);
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics).toEqual({
      present: true,
      startsWithPostgresScheme: true,
      lineBreakCount: 1,
      trimmedOuterWhitespace: false,
      containsHorizontalWhitespace: false,
      containsDisallowedControlCharacter: false,
    });
    expect(serialized).not.toContain(password);
    expect(serialized).not.toContain(projectRef);
  });

  it('rejects a pooler URL for a different Supabase project', () => {
    expect(() =>
      normalizeProductionDbUrl(
        sessionPoolerUrl({ ref: 'zyxwvutsrqponmlkjihg' }),
        projectRef,
      ),
    ).toThrow('does not belong to SUPABASE_PROJECT_ID');
  });

  it('rejects non-Supabase hosts, unsupported ports and unsafe fragments', () => {
    expect(() =>
      normalizeProductionDbUrl(
        sessionPoolerUrl({ host: 'attacker.example.com' }),
        projectRef,
      ),
    ).toThrow('not an approved Supabase database endpoint');

    expect(() =>
      normalizeProductionDbUrl(sessionPoolerUrl({ port: '9999' }), projectRef),
    ).toThrow('must use port 5432 or 6543');

    expect(() =>
      normalizeProductionDbUrl(`${sessionPoolerUrl()}#secret`, projectRef),
    ).toThrow('contains a URL fragment');
  });

  it('writes the normalized URL to an owner-only temporary file', () => {
    const root = mkdtempSync(join(tmpdir(), 'supabase-db-url-'));
    const outputPath = join(root, 'connection', 'db-url');
    const source = sessionPoolerUrl();
    const diagnostics = writeProtectedConnectionFile({
      rawValue: ` ${source.replace('@', '\n@')} `,
      projectRef,
      outputPath,
    });

    expect(readFileSync(outputPath, 'utf8')).toBe(source);
    expect(statSync(outputPath).mode & 0o777).toBe(0o600);
    expect(diagnostics.trimmedOuterWhitespace).toBe(true);
    expect(diagnostics.removedLineBreakCount).toBe(1);
  });

  it('requires a valid project reference and a password-bearing URL', () => {
    expect(() => normalizeProductionDbUrl(sessionPoolerUrl(), 'invalid')).toThrow(
      '20-character lowercase project reference',
    );
    expect(() =>
      normalizeProductionDbUrl(
        `postgresql://postgres.${projectRef}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
        projectRef,
      ),
    ).toThrow('must include the database password');
  });
});
