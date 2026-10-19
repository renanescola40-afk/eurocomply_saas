"""Synthetic-only Supabase PG17 target compatibility probe. No production access."""
import json, os, subprocess, tempfile, time
from pathlib import Path
IMAGE = "supabase/postgres:17.6.1.127"
REQUIRED = {"plpgsql": "1.0", "pg_stat_statements": "1.11", "uuid-ossp": "1.1",
            "pgcrypto": "1.3", "supabase_vault": "0.3.1", "wrappers": "0.6.1"}
ENV = {k: os.environ[k] for k in ("PATH", "HOME") if k in os.environ}
PREFIX = "risck-synthetic-target-" + str(os.getpid())
containers = []
stage = "pull"
def run(args, **kw):
    result = subprocess.run(args, env=ENV, capture_output=True, timeout=kw.pop("timeout", 90), **kw)
    if result.returncode:
        raise RuntimeError("NATIVE_STEP_FAILED")
    return result.stdout
def sql(container, query, database="postgres"):
    return run(["docker","exec",container,"psql","-X","-qAt","-U","supabase_admin","-d",database,"-v","ON_ERROR_STOP=1","-c",query],text=True)
def start(suffix):
    name=PREFIX+suffix
    run(["docker","run","-d","--name",name,"--network","none",
         "--env","POSTGRES_PASSWORD=synthetic-only-not-production",
         "--env","POSTGRES_DB=postgres",IMAGE],text=True)
    containers.append(name)
    for _ in range(60):
        ready=subprocess.run(["docker","exec",name,"pg_isready","-U","supabase_admin","-d","postgres"],env=ENV,capture_output=True)
        if ready.returncode==0:return name
        time.sleep(1)
    raise RuntimeError("SYNTHETIC_START_TIMEOUT")
evidence={"scope":"SYNTHETIC_ONLY","image":IMAGE,"production_credentials_used":False,
          "customer_rows_exported":False,"production_writes":False,"production_recovery":"NOT_TESTED"}
try:
    run(["docker","pull",IMAGE],text=True,timeout=300)
    stage="source_start"
    source=start("-source")
    stage="extension_inventory"
    versions=json.loads(sql(source,"SELECT coalesce(json_object_agg(name, versions),'{}'::json) FROM (SELECT name,json_agg(version) AS versions FROM pg_available_extension_versions WHERE name IN ('plpgsql','pg_stat_statements','uuid-ossp','pgcrypto','supabase_vault','wrappers') GROUP BY name) v"))
    evidence["required_extension_versions_available"]={k:v in versions.get(k,[]) for k,v in REQUIRED.items()}
    if not all(evidence["required_extension_versions_available"].values()):
        raise RuntimeError("REQUIRED_EXTENSION_VERSION_UNAVAILABLE")
    stage="synthetic_setup"
    sql(source,"CREATE DATABASE recovery_source")
    sql(source,'''CREATE SCHEMA extensions; CREATE SCHEMA vault; CREATE SCHEMA auth;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions VERSION '1.11';
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions VERSION '1.1';
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions VERSION '1.3';
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault VERSION '0.3.1';
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions VERSION '0.6.1';
CREATE TABLE auth.synthetic_users(id uuid PRIMARY KEY);
CREATE TABLE public.synthetic_items(id integer PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.synthetic_users(id));
INSERT INTO auth.synthetic_users VALUES ('00000000-0000-0000-0000-000000000001');
INSERT INTO public.synthetic_items VALUES (1,'00000000-0000-0000-0000-000000000001');
ALTER TABLE public.synthetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synthetic_items FORCE ROW LEVEL SECURITY;
CREATE POLICY synthetic_isolation ON public.synthetic_items USING (false);''',"recovery_source")
    stage="destination_start"
    dest=start("-dest")
    sql(dest,"CREATE DATABASE recovery_destination")
    stage="synthetic_dump_restore"
    with tempfile.TemporaryDirectory(prefix="risck-synthetic-dump-") as work:
        dump=run(["docker","exec",source,"pg_dump","-U","supabase_admin","-d","recovery_source","--format=custom","--no-owner","--no-acl"])
        run(["docker","exec","-i",dest,"pg_restore","-U","supabase_admin","-d","recovery_destination","--no-owner","--no-acl","--exit-on-error"],input=dump)
        del dump
    stage="verify_restore"
    result=json.loads(sql(dest,'''SELECT json_build_object(
'row_counts',(SELECT count(*)=1 FROM public.synthetic_items) AND (SELECT count(*)=1 FROM auth.synthetic_users),
'cross_schema_fk',(SELECT count(*)=1 FROM pg_constraint WHERE conrelid='public.synthetic_items'::regclass AND contype='f'),
'force_rls',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.synthetic_items'::regclass),
'policy',(SELECT count(*)=1 FROM pg_policy WHERE polrelid='public.synthetic_items'::regclass),
'extension_versions',(SELECT count(*)=6 FROM pg_extension WHERE (extname,extversion) IN (('plpgsql','1.0'),('pg_stat_statements','1.11'),('uuid-ossp','1.1'),('pgcrypto','1.3'),('supabase_vault','0.3.1'),('wrappers','0.6.1'))))''',"recovery_destination"))
    evidence["restored_assertions"]=result
    if not all(result.values()):raise RuntimeError("RESTORE_ASSERTION_FAILED")
    evidence["status"]="PASS_SYNTHETIC_TARGET_ONLY"
except Exception:
    evidence["status"]="FAILED_SYNTHETIC_TARGET_ONLY"
    evidence["failure_stage"]=stage
finally:
    cleanup=True
    for container in containers:
        r=subprocess.run(["docker","rm","-fv",container],env=ENV,capture_output=True,timeout=30)
        cleanup=cleanup and r.returncode==0
    evidence["synthetic_containers_removed"]=cleanup
    if not cleanup:evidence["status"]="FAILED_SYNTHETIC_TARGET_ONLY"
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/supabase-target-probe.json").write_text(json.dumps(evidence,indent=2)+"\n")
    print(json.dumps(evidence))
raise SystemExit(0 if evidence["status"]=="PASS_SYNTHETIC_TARGET_ONLY" else 1)
