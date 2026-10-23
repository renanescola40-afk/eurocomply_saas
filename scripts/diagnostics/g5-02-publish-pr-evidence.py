#!/usr/bin/env python3
"""Publish only synthetic G5-02 summary to an explicitly supplied PR; no raw SQL or client data."""
import json,os,pathlib,re,sys,urllib.request,urllib.error
sha=os.getenv("GITHUB_SHA","")
ref=os.getenv("GITHUB_REF_NAME","")
token=os.getenv("G5_GITHUB_TOKEN","")
if ref!="fix/g5-02-evidence-failclosed-20261023" or not re.fullmatch(r"[a-f0-9]{40}",sha):
    sys.exit("invalid exact-SHA or branch for PR evidence")
if not token:
    print("G5_02_PR_PUBLICATION=UNAVAILABLE_NO_TOKEN")
    sys.exit(0)
base=pathlib.Path("artifacts/g5-02-pg17")
def load(name):
    p=base/name
    if not p.is_file():return None
    try:return json.loads(p.read_text())
    except (OSError,ValueError):return None
discovery=load("source-discovery.json")
replay=load("replay.json")
unresolved=(discovery or {}).get("still_unresolved",[])
missing=(discovery or {}).get("missing_count")
completed=(replay or {}).get("completed",0)
status=(replay or {}).get("status","NOT_RUN")
failure=(replay or {}).get("failure_code","NOT_RUN")
if not isinstance(unresolved,list) or any(not re.fullmatch(r"\d{14}",str(x)) for x in unresolved):
    unresolved=[]
if not isinstance(missing,int):missing="not available"
if not isinstance(completed,int):completed=0
if status not in ("PASS","FAIL"):status="NOT_RUN"
if not re.fullmatch(r"[A-Z_0-9]{1,60}",str(failure)):failure="UNCLASSIFIED"
marker=f"<!-- G5-02-EVIDENCE-{sha} -->"
body=f"""## G5-02 synthetic replay — build evidence
{marker}
- Exact source SHA: \`{sha}\`
- Canonical ledger count expected: **137**
- Historical versions without canonical pathname: **{missing}**
- Historical versions without any located SQL candidate: **{len(unresolved)}**
- Unresolved version IDs: **{', '.join(unresolved) if unresolved else 'none reported'}**
- Isolated replay steps completed: **{completed}/137**
- Replay result: **{status}**
- Failure class: **{failure}**
- A-12/A-13/A-14: **NOT VERIFIED**, unless independently reviewed against gate criteria.
- Production writes: **none**. QA reset: **none**.

Detailed synthetic-only evidence stays in Buildkite build artifacts. Historical file matches are not proof of equivalent SQL.
"""
payload=json.dumps({"body":body}).encode()
pr_number=os.getenv("G5_PR_NUMBER","")
if not re.fullmatch(r"[1-9][0-9]{0,7}",pr_number):
    print("G5_02_PR_PUBLICATION=UNAVAILABLE_PR_NUMBER_NOT_SET")
    sys.exit(0)
url=f"https://api.github.com/repos/renanescola40-afk/eurocomply_saas/issues/{pr_number}/comments"
req=urllib.request.Request(url,data=payload,method="POST",headers={
    "Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
    "Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"risck-g5-02-evidence-reporter"})
try:
    with urllib.request.urlopen(req,timeout=12) as resp:
        print(f"G5_02_PR_PUBLICATION=POSTED HTTP_{resp.status} SHA={sha}")
except urllib.error.HTTPError as e:
    print(f"G5_02_PR_PUBLICATION=FAILED HTTP_{e.code}; see GitHub App token permissions")
except (urllib.error.URLError,TimeoutError):
    print("G5_02_PR_PUBLICATION=FAILED_NETWORK")
