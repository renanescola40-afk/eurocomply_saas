"""DAT-01: never turn a successful source preflight into replay authorization."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "scripts/diagnostics/g5-02-canonical-replay.py"

class Dat01ReplayGuardTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for p in ["scripts/diagnostics", "supabase/migrations"]:
            (self.root / p).mkdir(parents=True, exist_ok=True)
        versions = [f"{n:014d}" for n in range(1, 138)]
        for v in versions:
            (self.root / "supabase/migrations" / f"{v}_fixture.sql").write_text("SELECT 1;\n")
        (self.root / "scripts/diagnostics/g5-02-prod-ledger-versions.json").write_text(
            json.dumps({"versions": versions}))
        shutil.copyfile(SCRIPT, self.root / "scripts/diagnostics/g5-02-canonical-replay.py")
        shutil.copyfile(REPO / "scripts/diagnostics/dat01_pg17_target_boundary.py",
                        self.root / "scripts/diagnostics/dat01_pg17_target_boundary.py")

    def execute(self, report, code=0):
        preflight = self.root / "scripts/diagnostics/dat01-provider-provenance-preflight.py"
        preflight.write_text("import json,sys\nprint(" + repr(json.dumps(report)) +
                             ")\nsys.exit(" + str(code) + ")\n")
        env = dict(os.environ)
        for name in ["CIRCLE_SHA1", "DATABASE_URL", "DIRECT_URL", "SUPABASE_SERVICE_ROLE_KEY",
                     "SUPABASE_ACCESS_TOKEN", "PGSERVICEFILE", "PGPASSFILE",
                     "PGHOSTADDR", "PGSERVICE", "PGSYSCONFDIR", "PGOPTIONS",
                     "PGTARGETSESSIONATTRS", "PGLOADBALANCEHOSTS", "PGPORT", "PGUSER"]:
            env.pop(name, None)
        env["PGHOST"] = "127.0.0.1"
        env["PGDATABASE"] = "risck_synthetic"
        result = subprocess.run([sys.executable, "scripts/diagnostics/g5-02-canonical-replay.py"],
                                cwd=self.root, env=env, capture_output=True, text=True, timeout=8)
        artifact = json.loads((self.root / "artifacts/g5-02-pg17/replay.json").read_text())
        return result, artifact

    def test_successful_source_preflight_without_review_still_blocks_all_replay(self):
        report = {"status": "PREFLIGHT_OK", "verified": 137, "unverified": 0,
                  "migration_execution_authorized": False,
                  "qualified_independent_review_approved": False}
        result, evidence = self.execute(report)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(evidence["failure_code"], "DAT01_REPLAY_REVIEW_MISSING")
        self.assertEqual(evidence["completed"], 0)
        self.assertEqual(evidence["files"], [])
        self.assertFalse(evidence["production_writes"])

    def test_forged_single_authorization_flag_cannot_bypass_independent_review(self):
        report = {"status": "PREFLIGHT_OK", "verified": 137, "unverified": 0,
                  "migration_execution_authorized": True,
                  "qualified_independent_review_approved": False}
        _, evidence = self.execute(report)
        self.assertEqual(evidence["failure_code"], "DAT01_REPLAY_REVIEW_MISSING")
        self.assertEqual(evidence["completed"], 0)

    def test_preflight_wrong_status_must_not_reach_postgres(self):
        report = {"status": "BLOCKED", "verified": 137, "unverified": 0,
                  "migration_execution_authorized": True,
                  "qualified_independent_review_approved": True}
        _, evidence = self.execute(report)
        self.assertEqual(evidence["failure_code"], "DAT01_PROVIDER_PROVENANCE_BLOCKED")
        self.assertEqual(evidence["completed"], 0)

    def test_preflight_error_exit_blocks_before_database_compatibility_check(self):
        _, evidence = self.execute({"status": "PREFLIGHT_OK"}, code=2)
        self.assertEqual(evidence["failure_code"], "DAT01_PROVIDER_PROVENANCE_BLOCKED")
        self.assertEqual(evidence["completed"], 0)

    def test_libpq_hostaddr_override_fails_before_any_source_or_sql_replay(self):
        old = os.environ.get("PGHOSTADDR")
        os.environ["PGHOSTADDR"] = "198.51.100.10"
        try:
            # execute() cleans hostaddr for its standard fixture; preserve the
            # explicit override in a direct copy of its setup instead.
            bad = dict(os.environ)
            bad["PGHOST"] = "127.0.0.1"
            bad["PGDATABASE"] = "risck_synthetic"
            from importlib.util import spec_from_file_location, module_from_spec
            spec = spec_from_file_location("scope", REPO / "scripts/diagnostics/dat01_pg17_target_boundary.py")
            module = module_from_spec(spec)
            spec.loader.exec_module(module)
            with self.assertRaisesRegex(module.TargetRefused, "PGHOSTADDR"):
                module.validate_local_connection(bad)
        finally:
            if old is None: os.environ.pop("PGHOSTADDR", None)
            else: os.environ["PGHOSTADDR"] = old

if __name__ == "__main__":
    unittest.main()
