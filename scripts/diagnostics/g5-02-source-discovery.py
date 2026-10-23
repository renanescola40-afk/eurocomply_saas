#!/usr/bin/env python3
"""G5-02 offline source lookup; no provider access, no database writes."""
import json, pathlib, re, subprocess, hashlib, difflib
ledger=json.loads(pathlib.Path("scripts/diagnostics/g5-02-prod-ledger-versions.json").read_text())["versions"]
tracked=subprocess.check_output(["git","ls-files","--cached","--","*.sql"],text=True).splitlines()
records=[]
for path in tracked:
    p=pathlib.Path(path)
    prefix=re.match(r"^(\d{14})_",p.name)
    if prefix:
        records.append((prefix.group(1),path))
canonical={}
for v,path in records:
    if path.startswith("supabase/migrations/"):
        canonical.setdefault(v,[]).append(path)
missing=[v for v in ledger if v not in canonical]
candidates={}
for v in missing:
    matches=[p for pv,p in records if pv==v and not p.startswith("supabase/migrations/")]
    candidates[v]=matches
out={
  "schema":"risck-comply.g5-02-ledger-source-discovery.v1",
  "missing_versions":missing,
  "missing_count":len(missing),
  "found_outside_canonical_directory":{v:paths for v,paths in candidates.items() if paths},
  "still_unresolved":[v for v,paths in candidates.items() if not paths],
  "note":"Identical timestamp does not prove SQL equivalence; verify origin and SHA256 before replay."
}
pathlib.Path("artifacts/g5-02-pg17").mkdir(parents=True,exist_ok=True)
pathlib.Path("artifacts/g5-02-pg17/source-discovery.json").write_text(json.dumps(out,indent=2)+"\n")
print(json.dumps({k:v for k,v in out.items() if k not in ("found_outside_canonical_directory",)},indent=2))
