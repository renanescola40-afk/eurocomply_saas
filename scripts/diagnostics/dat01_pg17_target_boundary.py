#!/usr/bin/env python3
"""Fail-closed *local synthetic* PostgreSQL 17 replay target boundary.

Read-only target inspection only; NEVER grants authorization to replay SQL.
This module contains no migrations, SQL writes, external provider access,
database secrets, or blanket acceptance of a PostgreSQL instance.
"""
import json
import os
import subprocess

EXPECTED_HOSTS = frozenset(("localhost", "127.0.0.1"))
EXPECTED_DB = "risck_synthetic"
EXPECTED_USER = "risck_synthetic"
DISALLOWED_LIBPQ_OVERRIDES = (
    "PGHOSTADDR", "PGSERVICE", "PGSERVICEFILE", "PGSYSCONFDIR",
    "PGOPTIONS", "PGTARGETSESSIONATTRS", "PGLOADBALANCEHOSTS",
)
# Only non-system relations under public are counted. Supabase auth/storage
# bootstrap scaffolding is not proof that the application's public schema is clean.
TARGET_METADATA_SQL = """
SELECT json_build_object(
  'db_name', current_database(),
  'server_version_num', current_setting('server_version_num')::integer,
  'server_address', inet_server_addr()::text,
  'public_relations', (
    SELECT count(*)::integer
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
  ),
  'migration_table_present',
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
)::text
"""
MIGRATION_COUNT_SQL = "SELECT count(*) FROM supabase_migrations.schema_migrations"

class TargetRefused(ValueError):
    def __init__(self, code):
        super().__init__(code)
        self.code = code

def validate_local_connection(env):
    if env.get("PGHOST") not in EXPECTED_HOSTS:
        raise TargetRefused("TARGET_NONLOCAL_PGHOST")
    if env.get("PGDATABASE") != EXPECTED_DB:
        raise TargetRefused("TARGET_DB_NAME_MISMATCH")
    if env.get("PGUSER") not in (None, "", EXPECTED_USER):
        raise TargetRefused("TARGET_PGUSER_OVERRIDE")
    if env.get("PGPORT") not in (None, "", "5432"):
        raise TargetRefused("TARGET_PGPORT_OVERRIDE")
    # Official libpq docs: hostaddr can override the TCP destination even
    # when caller explicitly passes -h 127.0.0.1. Reject it unconditionally.
    for name in DISALLOWED_LIBPQ_OVERRIDES:
        if env.get(name):
            raise TargetRefused("TARGET_LIBPQ_OVERRIDE_" + name)
    return True

def validate_target_metadata(metadata, migration_rows):
    if not isinstance(metadata, dict):
        raise TargetRefused("TARGET_METADATA_INVALID")
    if metadata.get("db_name") != EXPECTED_DB:
        raise TargetRefused("TARGET_DB_IDENTITY_MISMATCH")
    version = metadata.get("server_version_num")
    if type(version) is not int or version // 10000 != 17:
        raise TargetRefused("TARGET_PG17_REQUIRED")
    if metadata.get("server_address") != "127.0.0.1":
        raise TargetRefused("TARGET_NOT_LOOPBACK_TCP")
    relation_count = metadata.get("public_relations")
    if type(relation_count) is not int or relation_count < 0:
        raise TargetRefused("TARGET_PUBLIC_RELATIONS_INVALID")
    if type(migration_rows) is not int or migration_rows < 0:
        raise TargetRefused("TARGET_LEDGER_COUNT_INVALID")
    if relation_count != 0:
        raise TargetRefused("TARGET_PUBLIC_SCHEMA_NOT_EMPTY")
    if migration_rows != 0:
        raise TargetRefused("TARGET_MIGRATION_HISTORY_NOT_EMPTY")
    return {
        "status": "LOCAL_SYNTHETIC_PG17_TARGET_PREFLIGHT_PASS_ONLY",
        "public_relations": 0,
        "migration_history_rows": 0,
        "targetIsolatedLoopback": True,
        "historicalReplayAuthorized": False,
        "qualifiedIndependentApproval": False,
        "productionWrites": 0,
    }

def read_only_target_preflight(*, env=None, runner=None):
    values = dict(os.environ if env is None else env)
    validate_local_connection(values)
    execute = subprocess.run if runner is None else runner
    # Explicit -h/-U/-d and -X avoid libpq defaults and .psqlrc execution.
    def read(sql):
        cmd = [
            "psql", "-X", "-t", "-A", "-v", "ON_ERROR_STOP=1",
            "-h", "127.0.0.1", "-U", EXPECTED_USER,
            "-d", EXPECTED_DB, "-c", sql,
        ]
        try:
            result = execute(cmd, capture_output=True, text=True, timeout=12)
        except (OSError, subprocess.TimeoutExpired):
            raise TargetRefused("TARGET_READONLY_PROBE_FAILED") from None
        if result.returncode != 0:
            raise TargetRefused("TARGET_READONLY_PROBE_FAILED")
        # Suppress SQL/DB details from logs. Accept a single psql row only.
        lines = result.stdout.strip().splitlines()
        if len(lines) != 1 or len(lines[0]) > 8192:
            raise TargetRefused("TARGET_PROBE_OUTPUT_INVALID")
        return lines[0]
    try:
        metadata = json.loads(read(TARGET_METADATA_SQL))
    except (ValueError, TypeError):
        raise TargetRefused("TARGET_METADATA_INVALID") from None
    if not isinstance(metadata.get("migration_table_present"), bool):
        raise TargetRefused("TARGET_METADATA_INVALID")
    if metadata["migration_table_present"]:
        try:
            history_count = int(read(MIGRATION_COUNT_SQL))
        except (ValueError, TypeError):
            raise TargetRefused("TARGET_LEDGER_COUNT_INVALID") from None
    else:
        history_count = 0
    return validate_target_metadata(metadata, history_count)
