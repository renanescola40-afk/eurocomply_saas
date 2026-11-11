#!/usr/bin/env python3
"""G5-02 canonical migration replay; synthetic PostgreSQL only, fail closed."""
import hashlib, json, os, pathlib, re, subprocess, sys, time
from dat01_pg17_target_boundary import TargetRefused, validate_local_connection, read_only_target_preflight
out=pathlib.Path("artifacts/g5-02-pg17")
out.mkdir(parents=True,exist_ok=True)
report={"status":"FAIL","kind":"G5_02_PG17_CANONICAL_REPLAY","source_sha":os.getenv("CIRCLE_SHA1"),"completed":0,"expected":137,"production_writes":False,"synthetic_only":True}
def save():
    (out/"replay.json").write_text(json.dumps(report,indent=2)+"\n")
def fail(code, message):
    report.update(failure_code=code,failure_reason=message);save();print(f"G5_02_FAILURE_CODE={code}; {message}", file=sys.stderr, flush=True);sys.exit(1)
for k in ("DATABASE_URL","DIRECT_URL","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_ACCESS_TOKEN","PGSERVICEFILE","PGPASSFILE"):
    if os.getenv(k): fail("PROVIDER_CREDENTIAL_PRESENT",f"forbidden variable: {k}")
if os.getenv("PGHOST") not in ("localhost","127.0.0.1"): fail("INVALID_PGHOST","local PostgreSQL only")
if os.getenv("PGDATABASE")!="risck_synthetic":fail("INVALID_PGDATABASE","synthetic database only")
try:
    validate_local_connection(os.environ)
except TargetRefused as exc:
    fail("DAT01_TARGET_CONNECTION_REFUSED",exc.code)
if os.getenv("CIRCLE_SHA1") and subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()!=os.getenv("CIRCLE_SHA1"):fail("SHA_MISMATCH","checkout mismatch")
manifest=json.loads(pathlib.Path("scripts/diagnostics/g5-02-prod-ledger-versions.json").read_text())
versions=manifest.get("versions",[])
if len(versions)!=137 or len(set(versions))!=137: fail("INVALID_LEDGER","expected 137 distinct versions")
files=sorted(pathlib.Path("supabase/migrations").glob("*.sql"))
by_version={}
for f in files:
    m=re.match(r"^(\d{14})_",f.name)
    if m:by_version.setdefault(m.group(1),[]).append(f)
missing=[v for v in versions if v not in by_version]
multiple=[v for v in versions if len(by_version.get(v,[]))>1]
if missing or multiple:
    # Version strings and filenames are source metadata, not customer data.
    # Emit the exact unresolved versions for deterministic root-cause review.
    report.update(missing_versions=missing,multiple_versions=multiple)
    print("G5_02_MISSING_LEDGER_VERSIONS=" + ",".join(missing), file=sys.stderr, flush=True)
    print("G5_02_DUPLICATE_LEDGER_VERSIONS=" + ",".join(multiple), file=sys.stderr, flush=True)
    fail("SOURCE_LEDGER_MISMATCH",f"missing_versions={len(missing)} duplicate_versions={len(multiple)}; see replay.json artifact")
report["manifest_sha256"]=hashlib.sha256(pathlib.Path("scripts/diagnostics/g5-02-prod-ledger-versions.json").read_bytes()).hexdigest()
report["files"]=[]
save()
# DAT-01: fail closed before executing even the first synthetic migration.
# Source-version equality alone cannot establish provider-statement equivalence.
preflight=subprocess.run([sys.executable,"scripts/diagnostics/dat01-provider-provenance-preflight.py"],capture_output=True,text=True)
if preflight.returncode!=0:
    report["provider_provenance"]="NOT_RECONCILED"
    fail("DAT01_PROVIDER_PROVENANCE_BLOCKED","source-only replay refused until provider SQL equivalence is verified")
try:
    preflight_result=json.loads(preflight.stdout)
except (ValueError,TypeError):
    fail("DAT01_PROVIDER_PROVENANCE_INVALID","preflight did not return valid JSON")
if (not isinstance(preflight_result,dict) or preflight_result.get("status")!="PREFLIGHT_OK"
        or preflight_result.get("verified")!=137 or preflight_result.get("unverified")!=0):
    fail("DAT01_PROVIDER_PROVENANCE_BLOCKED","preflight source identity incomplete")
# A successful provenance test exit is never permission to run migrations.
# Both guards must be explicitly approved by a separate qualified process.
# Current read-only preflight cannot issue either approval; DAT-01 remains BLOCKED.
if (preflight_result.get("migration_execution_authorized") is not True
        or preflight_result.get("qualified_independent_review_approved") is not True):
    report["provider_provenance"]="SOURCE_ONLY_NOT_REPLAY_AUTHORIZED"
    fail("DAT01_REPLAY_REVIEW_MISSING","successful source preflight is not an approved replay manifest")
report["provider_provenance"]="REVIEWED_SOURCE_REPLAY_AUTHORIZATION_REQUIRED"
subprocess.run(["pg_isready","-h","127.0.0.1","-U","risck_synthetic","-d","risck_synthetic"],check=True,stdout=subprocess.DEVNULL)
# Require an actually empty local synthetic target; a zero-row migration table
# alone does not mean an empty schema. No migration is executed by this probe.
try:
    report["target_preflight"] = read_only_target_preflight()
except TargetRefused as exc:
    report["target_preflight"] = {"status": "BLOCKED", "errorCode": exc.code}
    fail("DAT01_TARGET_NOT_CLEAN",exc.code)
for i,v in enumerate(versions,1):
    f=by_version[v][0]
    dig=hashlib.sha256(f.read_bytes()).hexdigest()
    # ON_ERROR_STOP + single transaction; each migration atomic. Redact error text in artifacts.
    proc=subprocess.run(["psql","-X","-v","ON_ERROR_STOP=1","-h","127.0.0.1","-U","risck_synthetic","-d","risck_synthetic","--single-transaction","-f",str(f)],capture_output=True,text=True)
    record={"position":i,"version":v,"path":str(f),"sha256":dig,"ok":proc.returncode==0}
    report["files"].append(record)
    if proc.returncode:
        # Do not persist raw stdout/stderr, which may include SQL fragments.
        match=re.search(r"SQLSTATE\s*[:=]\s*([A-Z0-9]{5})",proc.stderr)
        report.update(first_failed=record,sqlstate=match.group(1) if match else "UNAVAILABLE")
        fail("MIGRATION_REPLAY_FAILED",f"position={i} version={v} psql_exit={proc.returncode}; see replay.json; no raw SQL emitted")
    report["completed"]=i
    save()
report["status"]="PASS"
save()
