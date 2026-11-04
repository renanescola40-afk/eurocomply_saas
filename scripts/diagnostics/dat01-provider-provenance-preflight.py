#!/usr/bin/env python3
"""DAT-01 read-only source provenance preflight; never authorizes production writes."""
import hashlib
import json
from pathlib import Path

def inspect(root=Path(".")):
    manifest=json.loads((root/"scripts/diagnostics/g5-02-prod-ledger-versions.json").read_text())
    evidence=json.loads((root/"docs/enterprise/evidence/G1_PROD_PROVIDER_SQL_STATEMENT_SHA256_2026-10-22.json").read_text())
    versions=manifest["versions"]
    entries=evidence["entries"]
    if evidence.get("projectRef")!="tganhbbhfxcpblmgqprg" or evidence.get("count")!=137:
        raise ValueError("PROVIDER_EVIDENCE_IDENTITY_MISMATCH")
    if len(versions)!=137 or len(set(versions))!=137 or len(entries)!=137:
        raise ValueError("INVALID_LEDGER")
    if [str(e["version"]) for e in entries]!=versions or [e.get("order") for e in entries]!=list(range(1,138)):
        raise ValueError("LEDGER_ORDER_MISMATCH")
    unverified=[]
    for entry in entries:
        paths=list((root/"supabase/migrations").glob(str(entry["version"])+"_*.sql"))
        if len(paths)!=1:
            unverified.append(str(entry["version"]))
            continue
        source=paths[0]
        digest=hashlib.sha256(source.read_bytes()).hexdigest()
        if not (entry.get("statement_count")==1 and digest==entry.get("statement_sha256") and digest==entry.get("source_sha256") and source.relative_to(root).as_posix()==entry.get("source_file")):
            unverified.append(str(entry["version"]))
    return {"status":"BLOCKED" if unverified else "PREFLIGHT_OK","verified":137-len(unverified),"unverified":len(unverified),"migration_execution_authorized":not unverified,"formal_gate_accepted":False,"production_writes":False}

if __name__=="__main__":
    try:
        result=inspect()
    except (ValueError,KeyError,OSError) as exc:
        result={"status":"BLOCKED","reason":type(exc).__name__,"formal_gate_accepted":False}
    print(json.dumps(result,sort_keys=True))
    raise SystemExit(0 if result["status"]=="PREFLIGHT_OK" else 2)
