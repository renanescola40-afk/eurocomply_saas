"""DAT-01 no-dirty-replay-target & libpq remote-hostaddr negative contracts."""
import json
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "diagnostics"))
from dat01_pg17_target_boundary import (
    TargetRefused, validate_local_connection, validate_target_metadata,
    read_only_target_preflight, TARGET_METADATA_SQL, MIGRATION_COUNT_SQL,
)
VALID_ENV = {"PGHOST": "127.0.0.1", "PGDATABASE": "risck_synthetic"}
VALID_METADATA = {
    "db_name": "risck_synthetic",
    "server_version_num": 170011,
    "server_address": "127.0.0.1",
    "public_relations": 0,
    "migration_table_present": True,
}

class Dat01TargetBoundaryTest(unittest.TestCase):
    def assert_rejects(self, code, fn):
        with self.assertRaises(TargetRefused) as ctx:
            fn()
        self.assertEqual(ctx.exception.code, code)

    def test_clean_local_pg17_synthetic_target_is_preflight_only(self):
        result = validate_target_metadata(dict(VALID_METADATA), 0)
        self.assertFalse(result["historicalReplayAuthorized"])
        self.assertFalse(result["qualifiedIndependentApproval"])
        self.assertEqual(result["productionWrites"], 0)

    def test_neon_like_target_zero_ledger_but_many_public_tables_is_blocked(self):
        # Observed in existing Neon branch: 115 public tables, zero migration rows.
        m = dict(VALID_METADATA, public_relations=115)
        self.assert_rejects("TARGET_PUBLIC_SCHEMA_NOT_EMPTY",
            lambda: validate_target_metadata(m, 0))

    def test_qa_like_target_with_nine_migrations_is_blocked(self):
        self.assert_rejects("TARGET_MIGRATION_HISTORY_NOT_EMPTY",
            lambda: validate_target_metadata(dict(VALID_METADATA), 9))

    def test_major_version_mismatch_or_missing_server_address_fails_closed(self):
        self.assert_rejects("TARGET_PG17_REQUIRED",
            lambda: validate_target_metadata(dict(VALID_METADATA, server_version_num=160011), 0))
        self.assert_rejects("TARGET_NOT_LOOPBACK_TCP",
            lambda: validate_target_metadata(dict(VALID_METADATA, server_address=None), 0))
        self.assert_rejects("TARGET_DB_IDENTITY_MISMATCH",
            lambda: validate_target_metadata(dict(VALID_METADATA, db_name="postgres"), 0))

    def test_local_pg_hostaddr_override_cannot_redirect_to_remote_ip(self):
        for addr in ("198.51.100.10", "10.0.0.1", "127.0.0.1", "::1"):
            self.assert_rejects("TARGET_LIBPQ_OVERRIDE_PGHOSTADDR",
                lambda addr=addr: validate_local_connection(dict(VALID_ENV, PGHOSTADDR=addr)))

    def test_disallowed_service_options_and_nonsynthetic_targets_rejected(self):
        for key in ("PGSERVICE", "PGSERVICEFILE", "PGOPTIONS",
                    "PGSYSCONFDIR", "PGTARGETSESSIONATTRS", "PGLOADBALANCEHOSTS"):
            self.assert_rejects("TARGET_LIBPQ_OVERRIDE_" + key,
                lambda key=key: validate_local_connection(dict(VALID_ENV, **{key:"malicious"})))
        self.assert_rejects("TARGET_PGPORT_OVERRIDE",
            lambda: validate_local_connection(dict(VALID_ENV, PGPORT="5441")))
        self.assert_rejects("TARGET_NONLOCAL_PGHOST",
            lambda: validate_local_connection(dict(VALID_ENV, PGHOST="db.provider.example")))
        self.assert_rejects("TARGET_DB_NAME_MISMATCH",
            lambda: validate_local_connection(dict(VALID_ENV, PGDATABASE="postgres")))

    def test_readonly_probe_rejects_dirty_target_even_without_ledger(self):
        calls = []
        def fake_run(command, **kwargs):
            calls.append(command)
            data = dict(VALID_METADATA, public_relations=115,
                        migration_table_present=False)
            return type("Result", (), {
                "returncode":0, "stdout":json.dumps(data) + "\n"
            })()
        self.assert_rejects("TARGET_PUBLIC_SCHEMA_NOT_EMPTY",
            lambda: read_only_target_preflight(env=VALID_ENV, runner=fake_run))
        self.assertEqual(len(calls), 1)
        self.assertIn("json_build_object", calls[0][-1])
        self.assertNotIn("INSERT", calls[0][-1].upper())
        self.assertNotIn("DELETE", calls[0][-1].upper())

    def test_probe_reads_migration_count_only_if_table_exists_and_rejects_nonzero(self):
        calls = []
        def fake_run(command, **kwargs):
            calls.append(command)
            value = json.dumps(VALID_METADATA) if len(calls) == 1 else "9"
            return type("Result", (), {"returncode":0, "stdout":value + "\n"})()
        self.assert_rejects("TARGET_MIGRATION_HISTORY_NOT_EMPTY",
            lambda: read_only_target_preflight(env=VALID_ENV, runner=fake_run))
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1][-1], MIGRATION_COUNT_SQL)

    def test_probe_with_empty_ledger_does_not_run_any_migration(self):
        calls=[]
        def fake_run(command, **kwargs):
            calls.append(command)
            value=json.dumps(VALID_METADATA) if len(calls)==1 else "0"
            return type("Result", (), {"returncode":0, "stdout":value + "\n"})()
        result = read_only_target_preflight(env=VALID_ENV, runner=fake_run)
        self.assertEqual(result["status"], "LOCAL_SYNTHETIC_PG17_TARGET_PREFLIGHT_PASS_ONLY")
        self.assertEqual(len(calls),2)
        self.assertTrue(all(x[0]=="psql" and x[-2]=="-c" for x in calls))
        self.assertFalse(result["historicalReplayAuthorized"])

    def test_provider_read_failure_cannot_return_a_clean_target(self):
        def fake_run(*args, **kwargs):
            return type("Result", (), {"returncode":1, "stdout":"", "stderr":"private error"})()
        self.assert_rejects("TARGET_READONLY_PROBE_FAILED",
            lambda: read_only_target_preflight(env=VALID_ENV, runner=fake_run))

if __name__ == "__main__":
    unittest.main()
