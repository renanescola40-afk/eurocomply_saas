import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[2]/"scripts/diagnostics/dat01-provider-provenance-preflight.py"

class ProvenancePreflightTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        (self.root/"scripts/diagnostics").mkdir(parents=True)
        (self.root/"docs/enterprise/evidence").mkdir(parents=True)
        (self.root/"supabase/migrations").mkdir(parents=True)
        self.versions=[f"{i:014d}" for i in range(1,138)]
        self.entries=[]
        for i,version in enumerate(self.versions,1):
            path=self.root/"supabase/migrations"/f"{version}_test.sql"
            path.write_text("SELECT 1;")
            digest=hashlib.sha256(path.read_bytes()).hexdigest()
            self.entries.append({"order":i,"version":version,"statement_count":1,"statement_sha256":digest,"source_sha256":digest,"source_file":f"supabase/migrations/{path.name}"})
        (self.root/"scripts/diagnostics/g5-02-prod-ledger-versions.json").write_text(json.dumps({"versions":self.versions}))
        self.save_evidence()

    def save_evidence(self):
        (self.root/"docs/enterprise/evidence/G1_PROD_PROVIDER_SQL_STATEMENT_SHA256_2026-10-22.json").write_text(json.dumps({"projectRef":"tganhbbhfxcpblmgqprg","count":137,"entries":self.entries}))

    def run_preflight(self):
        p=subprocess.run([sys.executable,str(SCRIPT)],cwd=self.root,capture_output=True,text=True)
        return p.returncode,json.loads(p.stdout)

    def test_exact_single_statement_sources_pass_preflight_only(self):
        code,report=self.run_preflight()
        self.assertEqual(code,0)
        self.assertEqual(report["status"],"PREFLIGHT_OK")
        self.assertEqual(report["verified"],137)
        self.assertFalse(report["migration_execution_authorized"])
        self.assertFalse(report["qualified_independent_review_approved"])
        self.assertFalse(report["postgres17_replay_completed"])
        self.assertFalse(report["formal_gate_accepted"])
        self.assertFalse(report["production_writes"])

    def test_multi_statement_source_is_not_accepted_by_raw_file_digest(self):
        self.entries[0]["statement_count"]=2
        self.save_evidence()
        code,report=self.run_preflight()
        self.assertEqual(code,2)
        self.assertEqual(report["status"],"BLOCKED")
        self.assertEqual(report["unverified"],1)
        self.assertFalse(report["migration_execution_authorized"])

    def test_wrong_provider_identity_is_blocked(self):
        evidence_path=self.root/"docs/enterprise/evidence/G1_PROD_PROVIDER_SQL_STATEMENT_SHA256_2026-10-22.json"
        evidence=json.loads(evidence_path.read_text())
        evidence["projectRef"]="other-provider"
        evidence_path.write_text(json.dumps(evidence))
        code,report=self.run_preflight()
        self.assertEqual(code,2)
        self.assertEqual(report["status"],"BLOCKED")
        self.assertFalse(report["migration_execution_authorized"])
        self.assertFalse(report["qualified_independent_review_approved"])
        self.assertFalse(report["postgres17_replay_completed"])

    def test_reordered_provider_entries_are_blocked(self):
        self.entries[0]["order"]=2
        self.save_evidence()
        code,report=self.run_preflight()
        self.assertEqual(code,2)
        self.assertEqual(report["status"],"BLOCKED")

    def test_changed_source_is_blocked(self):
        (self.root/"supabase/migrations"/f"{self.versions[0]}_test.sql").write_text("SELECT 2;")
        code,report=self.run_preflight()
        self.assertEqual(code,2)
        self.assertEqual(report["unverified"],1)

    def test_forged_provider_approval_flag_does_not_authorize_replay(self):
        evidence_path=self.root/"docs/enterprise/evidence/G1_PROD_PROVIDER_SQL_STATEMENT_SHA256_2026-10-22.json"
        evidence=json.loads(evidence_path.read_text())
        evidence["independent_review_approved"]=True
        evidence["replay_approved"]=True
        evidence_path.write_text(json.dumps(evidence))
        code,report=self.run_preflight()
        self.assertEqual(code,0)
        self.assertEqual(report["verified"],137)
        self.assertFalse(report["migration_execution_authorized"])
        self.assertFalse(report["qualified_independent_review_approved"])
        self.assertFalse(report["postgres17_replay_completed"])
        self.assertFalse(report["formal_gate_accepted"])

if __name__=="__main__":
    unittest.main()
