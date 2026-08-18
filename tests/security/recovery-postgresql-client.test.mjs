import { describe, expect, it } from 'vitest';

import {
  MAX_POSTGRESQL_CLIENT_MAJOR,
  MIN_POSTGRESQL_CLIENT_MAJOR,
  evaluatePostgresqlClientVersion,
  inspectPostgresqlClient,
  parsePostgresqlClientVersion,
} from '../../scripts/recovery/verify-postgresql-client.mjs';

describe('hermetic recovery PostgreSQL client preflight', () => {
  it('accepts the reviewed GitHub runner client range', () => {
    expect(MIN_POSTGRESQL_CLIENT_MAJOR).toBe(16);
    expect(MAX_POSTGRESQL_CLIENT_MAJOR).toBe(17);
    expect(parsePostgresqlClientVersion('psql (PostgreSQL) 16.14')).toEqual({
      major: 16,
      minor: 14,
      raw: 'psql (PostgreSQL) 16.14',
    });
    expect(evaluatePostgresqlClientVersion('psql (PostgreSQL) 16.14').ok).toBe(true);
    expect(evaluatePostgresqlClientVersion('psql (PostgreSQL) 17.6').ok).toBe(true);
  });

  it('fails closed on unreviewed or malformed client versions', () => {
    expect(evaluatePostgresqlClientVersion('psql (PostgreSQL) 15.12')).toMatchObject({
      ok: false,
      code: 'postgresql_client_version_unsupported',
    });
    expect(evaluatePostgresqlClientVersion('psql (PostgreSQL) 18.0')).toMatchObject({
      ok: false,
      code: 'postgresql_client_version_unsupported',
    });
    expect(evaluatePostgresqlClientVersion('unexpected output')).toEqual({
      ok: false,
      code: 'postgresql_client_version_unparseable',
      parsed: null,
    });
  });

  it('returns a bounded safe failure when psql is unavailable', () => {
    const result = inspectPostgresqlClient({
      run() {
        throw new Error('raw process details must not escape');
      },
    });
    expect(result).toEqual({
      ok: false,
      code: 'postgresql_client_unavailable',
      parsed: null,
    });
  });

  it('does not require package installation to verify the existing binary', () => {
    const calls = [];
    const result = inspectPostgresqlClient({
      run(command, args) {
        calls.push([command, args]);
        return 'psql (PostgreSQL) 16.14\n';
      },
    });
    expect(result.ok).toBe(true);
    expect(calls).toEqual([['psql', ['--version']]]);
  });
});
