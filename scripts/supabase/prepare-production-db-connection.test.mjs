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
  const passwordValue = overrides.password ?? password;
  return `postgresql://postgres.${ref}:${passwordValue}@${host}:${port}/postgres?sslmode=require`;
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
      canonicalizedPasswordEncoding: false,
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
    expect(result.diagnostics.canonicalizedPasswordEncoding).toBe(false);
  });

  it('canonicalizes raw reserved password characters without changing the password', () => {
    const rawPassword = 'M7!vQ9#Lx2@pR4/Zk8?:%';
    const result = normalizeProductionDbUrl(
      sessionPoolerUrl({ password: rawPassword }),
      projectRef,
    );
    const parsed = new URL(result.url);

    expect(decodeURIComponent(parsed.password)).toBe(rawPassword);
    expect(result.url).toContain('%23');
    expect(result.url).toContain('%40');
    expect(result.url).toContain('%2F');
    expect(result.url).toContain('%3F');
    expect(result.url).toContain('%3A');
    expect(result.url).toContain('%25');
    expect(result.diagnostics.canonicalizedPasswordEncoding).toBe(true);
  });

  it('preserves valid percent escapes instead of double-encoding them', () => {
    const encodedPassword = 'M7%21vQ9%23Lx2%40pR4%2FZk8';
    const result = normalizeProductionDbUrl(
      sessionPoolerUrl({ password: encodedPassword }),
      projectRef,
    );

    expect(result.url).toContain(encodedPassword);
    expect(result.url).not.toContain('%2521');
    expect(result.url).not.toContain('%2523');
    expect(result.diagnostics.canonicalizedPasswordEncoding).toBe(false);
  });

  it('normalizes a multiline URL and raw reserved password in one pass', () => {
    const rawPassword = 'Strong#Password@2026';
    const source = sessionPoolerUrl({ password: rawPassword });
    const result = normalizeProductionDbUrl(
      `\n${source.replace('@aws-', '\r\n@aws-')}\n`,
      projectRef,
    );

    expect(decodeURIComponent(new URL(result.url).password)).toBe(rawPassword);
    expect(result.diagnostics.removedLineBreakCount).toBe(3);
    expect(result.diagnostics.canonicalizedPasswordEncoding).toBe(true);
  });

  it('keeps strict URL validation after secret normalization', () => {
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
    const multiline = sessionPoolerUrl({ password: 'Strong#Password' }).replace(
      '@aws-',
      '\n@aws-',
    );
    const diagnostics = inspectProductionDbUrlInput(multiline);
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics).toEqual({
      present: true,
      startsWithPostgresScheme: true,
      lineBreakCount: 1,
      trimmedOuterWhitespace: false,
      containsHorizontalWhitespace: false,
      containsDisallowedControlCharacter: false,
      matchedSupabaseConnectionShape: true,
      canonicalizedPasswordEncoding: true,
    });
    expect(serialized).not.toContain('Strong#Password');
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
      normalizeProductionDbUrl(`${sessionPoolerUrl()}#fragment`, projectRef),
    ).toThrow('contains a URL fragment');
  });

  it('writes the canonical normalized URL to an owner-only temporary file', () => {
    const root = mkdtempSync(join(tmpdir(), 'supabase-db-url-'));
    const outputPath = join(root, 'connection', 'db-url');
    const rawPassword = 'Strong#Password@2026';
    const source = sessionPoolerUrl({ password: rawPassword });
    const diagnostics = writeProtectedConnectionFile({
      rawValue: ` ${source.replace('@aws-', '\n@aws-')} `,
      projectRef,
      outputPath,
    });
    const stored = readFileSync(outputPath, 'utf8');

    expect(decodeURIComponent(new URL(stored).password)).toBe(rawPassword);
    expect(stored).not.toContain('#');
    expect(statSync(outputPath).mode & 0o777).toBe(0o600);
    expect(diagnostics.trimmedOuterWhitespace).toBe(true);
    expect(diagnostics.removedLineBreakCount).toBe(1);
    expect(diagnostics.canonicalizedPasswordEncoding).toBe(true);
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
