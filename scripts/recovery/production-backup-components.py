"""Synthetic-only Supabase PG17 target compatibility probe. No production access."""
import json, os, subprocess, tempfile, time, hashlib, ast, re, selectors
from pathlib import Path
IMAGE = "supabase/postgres:17.6.1.127"
REQUIRED = {"plpgsql": "1.0", "pg_stat_statements": "1.11", "uuid-ossp": "1.1",
            "pgcrypto": "1.3", "supabase_vault": "0.3.1", "wrappers": "0.6.1"}
ENV = {k: os.environ[k] for k in ("PATH", "HOME") if k in os.environ}
PREFIX = "risck-synthetic-target-" + str(os.getpid())
containers = []
stage = "pull"
snapshot_process = None
OWNER_RECIPIENT = "age1d8zgu9c38njefxj528kfucns2e2pxu0zqyzcjrjj475l9652afxs8xfcqy"
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
    stage="load_production_components"
    tree=ast.parse(Path("scripts/recovery/production-backup-rehearsal.py").read_text())
    scope={"json":json,"re":re}
    selected=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ("qident","canonical","fingerprints")]
    for n in tree.body:
        if isinstance(n,ast.Assign):
            for target in n.targets:
                if isinstance(target,ast.Name) and target.id in ("TABLES_SQL","CATALOG_SQL"):scope[target.id]=ast.literal_eval(n.value)
    exec(compile(ast.Module(body=selected,type_ignores=[]),"reviewed-production-components","exec"),scope)
    stage="source_start"
    source=start("-source")
    stage="synthetic_role_bootstrap"
    for role in ("anon","authenticated"):
        sql(source,"DO $r$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='"+role+"') THEN CREATE ROLE "+role+" NOLOGIN; END IF; END $r$;")
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
CREATE POLICY synthetic_isolation ON public.synthetic_items USING (false);
ALTER TABLE public.synthetic_items OWNER TO postgres;
GRANT SELECT ON public.synthetic_items TO anon;
CREATE FUNCTION public.synthetic_security() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $SELECT true$;
ALTER FUNCTION public.synthetic_security() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.synthetic_security() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.synthetic_security() TO authenticated;''',"recovery_source")
    stage="export_consistent_synthetic_snapshot"
    snapshot_process=subprocess.Popen(["docker","exec","-i",source,"psql","-X","-qAt","-U","supabase_admin","-d","recovery_source","-v","ON_ERROR_STOP=1"],env=ENV,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    snapshot_process.stdin.write("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n");snapshot_process.stdin.flush()
    with selectors.DefaultSelector() as selector:
        selector.register(snapshot_process.stdout,selectors.EVENT_READ)
        if not selector.select(timeout=20):raise RuntimeError("SYNTHETIC_SNAPSHOT_TIMEOUT")
        snapshot=snapshot_process.stdout.readline().strip()
    if not re.fullmatch("[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+",snapshot):raise RuntimeError("SYNTHETIC_SNAPSHOT_FAILED")
    def src_query(query):
        return json.loads(sql(source,"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '"+snapshot+"'; SET LOCAL timezone='UTC'; "+query+"; COMMIT;","recovery_source"))
    before_rows=scope["fingerprints"](src_query)
    before_catalog=src_query(scope["CATALOG_SQL"])
    sql(source,"INSERT INTO public.synthetic_items VALUES(2,'00000000-0000-0000-0000-000000000001')","recovery_source")
    stage="destination_start"
    dest=start("-dest")
    for role in ("anon","authenticated"):
        sql(dest,"DO $r$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='"+role+"') THEN CREATE ROLE "+role+" NOLOGIN; END IF; END $r$;")
    sql(dest,"CREATE DATABASE recovery_destination")
    stage="synthetic_dump_restore"
    with tempfile.TemporaryDirectory(prefix="risck-encrypted-synthetic-") as tmp:
        work = Path(tmp)
        work.chmod(0o700)
        stage = "encryption_tools"
        build = work / "build"
        build.mkdir()
        (build / "Dockerfile").write_text("FROM postgres:17.6\nRUN apt-get update && apt-get install -y --no-install-recommends age && rm -rf /var/lib/apt/lists/*\n")
        tools = PREFIX + "-tools"
        run(["docker", "build", "--pull", "-t", tools, str(build)], timeout=300)
        common = ["docker","run","--rm","-i","--network","none","--read-only",
                  "--cap-drop=ALL","--security-opt=no-new-privileges",
                  "--user",str(os.getuid())+":"+str(os.getgid()),
                  "--mount",f"type=bind,src={work},dst=/work",
                  "--mount","type=bind,src=/etc/passwd,dst=/etc/passwd,readonly",
                  "--mount","type=bind,src=/etc/group,dst=/etc/group,readonly",tools]
        def age(args, **kw):
            return run(common + args, **kw)
        stage = "synthetic_keygen"
        age(["age-keygen","-o","/work/identity"])
        age(["age-keygen","-o","/work/wrong-identity"])
        recipient = age(["age-keygen","-y","/work/identity"], text=True).strip()
        evidence["age_version"] = age(["age","--version"], text=True).strip()
        stage = "stream_encrypt_synthetic_dump"
        producer = subprocess.Popen(["docker","exec",source,"pg_dump","-U","supabase_admin","-d","recovery_source","--format=custom","--snapshot="+snapshot], env=ENV, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        encryptor = subprocess.Popen(common+["age","-r",recipient,"-r",OWNER_RECIPIENT,"-o","/work/backup.dump.age"],env=ENV,stdin=producer.stdout,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        producer.stdout.close()
        try:
            encryptor.communicate(timeout=90)
            producer.communicate(timeout=30)
        finally:
            for process in (producer,encryptor):
                if process.poll() is None:process.kill();process.communicate()
        if producer.returncode or encryptor.returncode:raise RuntimeError("ENCRYPTION_PIPE_FAILED")
        snapshot_process.stdin.write("COMMIT;\n");snapshot_process.stdin.close()
        snapshot_process.wait(timeout=20)
        if snapshot_process.returncode:raise RuntimeError("SNAPSHOT_CLOSE_FAILED")
        snapshot_process=None
        evidence["owner_public_recipient_included"]=True
        ciphertext = work / "backup.dump.age"
        digest = hashlib.sha256(ciphertext.read_bytes()).hexdigest()
        (work / "backup.sha256").write_text(digest + "  backup.dump.age\n")
        run(["sha256sum","--check","backup.sha256"],cwd=work)
        evidence["ciphertext_checksum_verified"] = True
        stage = "negative_decryption_checks"
        wrong = subprocess.run(common+["age","-d","-i","/work/wrong-identity","/work/backup.dump.age"],env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)
        evidence["wrong_key_rejected"] = wrong.returncode != 0
        damaged = bytearray(ciphertext.read_bytes())
        damaged[-1] ^= 1
        (work / "tampered.age").write_bytes(damaged)
        del damaged
        tampered = subprocess.run(common+["age","-d","-i","/work/identity","/work/tampered.age"],env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)
        evidence["tampered_ciphertext_rejected"] = tampered.returncode != 0
        if not evidence["wrong_key_rejected"] or not evidence["tampered_ciphertext_rejected"]:raise RuntimeError("NEGATIVE_DECRYPTION_FAILED")
        stage = "stream_decrypt_restore"
        decryptor = subprocess.Popen(common+["age","-d","-i","/work/identity","/work/backup.dump.age"],env=ENV,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        restorer = subprocess.Popen(["docker","exec","-i",dest,"pg_restore","-U","supabase_admin","-d","recovery_destination","--exit-on-error"],env=ENV,stdin=decryptor.stdout,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        decryptor.stdout.close()
        try:
            restorer.communicate(timeout=90)
            decryptor.communicate(timeout=30)
        finally:
            for process in (decryptor,restorer):
                if process.poll() is None:process.kill();process.communicate()
        if restorer.returncode or decryptor.returncode:raise RuntimeError("DECRYPT_RESTORE_PIPE_FAILED")
        evidence["plaintext_dump_file_written"] = False
    evidence["synthetic_ciphertext_and_keys_removed"] = not work.exists()
    stage="verify_production_integrity_components"
    def dst_query(query):
        return json.loads(sql(dest,"BEGIN READ ONLY; SET LOCAL timezone='UTC'; "+query+"; COMMIT;","recovery_destination"))
    after_rows=scope["fingerprints"](dst_query)
    after_catalog=dst_query(scope["CATALOG_SQL"])
    evidence["snapshot_row_integrity_matches"]=before_rows==after_rows
    evidence["catalog_owner_acl_rls_matches"]=before_catalog==after_catalog
    evidence["catalog_sections_match"]={k:before_catalog[k]==after_catalog.get(k) for k in before_catalog}
    evidence["concurrent_insert_excluded_from_snapshot"]=json.loads(sql(dest,"SELECT json_build_object('ok',count(*)=1) FROM public.synthetic_items","recovery_destination"))["ok"]
    if not all(evidence[k] for k in ("snapshot_row_integrity_matches","catalog_owner_acl_rls_matches","concurrent_insert_excluded_from_snapshot")):raise RuntimeError("PRODUCTION_COMPONENT_COMPARISON_FAILED")
    stage="verify_restore"
    result=json.loads(sql(dest,'''SELECT json_build_object(
'row_counts',(SELECT count(*)=1 FROM public.synthetic_items) AND (SELECT count(*)=1 FROM auth.synthetic_users),
'cross_schema_fk',(SELECT count(*)=1 FROM pg_constraint WHERE conrelid='public.synthetic_items'::regclass AND contype='f'),
'force_rls',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.synthetic_items'::regclass),
'policy',(SELECT count(*)=1 FROM pg_policy WHERE polrelid='public.synthetic_items'::regclass),
'extension_versions',(SELECT count(*)=6 FROM pg_extension WHERE (extname,extversion) IN (('plpgsql','1.0'),('pg_stat_statements','1.11'),('uuid-ossp','1.1'),('pgcrypto','1.3'),('supabase_vault','0.3.1'),('wrappers','0.6.1'))))''',"recovery_destination"))
    evidence["restored_assertions"]=result
    if not all(result.values()):raise RuntimeError("RESTORE_ASSERTION_FAILED")
    evidence["status"]="PASS_PRODUCTION_BACKUP_COMPONENTS_SYNTHETIC_ONLY"
except Exception:
    evidence["status"]="FAILED_SYNTHETIC_TARGET_ONLY"
    evidence["failure_stage"]=stage
finally:
    if snapshot_process is not None and snapshot_process.poll() is None:
        snapshot_process.kill();snapshot_process.communicate()
    cleanup=True
    for container in containers:
        r=subprocess.run(["docker","rm","-fv",container],env=ENV,capture_output=True,timeout=30)
        cleanup=cleanup and r.returncode==0
    evidence["synthetic_containers_removed"]=cleanup
    if not cleanup:evidence["status"]="FAILED_SYNTHETIC_TARGET_ONLY"
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/supabase-target-probe.json").write_text(json.dumps(evidence,indent=2)+"\n")
    print(json.dumps(evidence))
raise SystemExit(0 if evidence["status"]=="PASS_ENCRYPTED_SYNTHETIC_TARGET_ONLY" else 1)
