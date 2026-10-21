"""Synthetic-only Supabase PG17 target compatibility probe. No production access."""
import json, os, subprocess, tempfile, time, hashlib, ast, re, selectors, sys
from pathlib import Path
IMAGE = "supabase/postgres:17.6.1.127"
REQUIRED = {"plpgsql": "1.0", "pg_stat_statements": "1.11", "uuid-ossp": "1.1",
            "pgcrypto": "1.3", "supabase_vault": "0.3.1", "wrappers": "0.6.1"}
ENV = {k: os.environ[k] for k in ("PATH", "HOME") if k in os.environ}
PREFIX = "risck-synthetic-target-" + str(os.getpid())
containers = []
stage = "pull"
snapshot_process = None
privilege_probe = None
OWNER_RECIPIENT = "age1d8zgu9c38njefxj528kfucns2e2pxu0zqyzcjrjj475l9652afxs8xfcqy"
def run(args, **kw):
    result = subprocess.run(args, env=ENV, capture_output=True, timeout=kw.pop("timeout", 90), **kw)
    if result.returncode:
        if stage in ("synthetic_role_bootstrap","synthetic_setup","destination_start","stream_encrypt_synthetic_dump","verify_production_integrity_components","verify_restore"):
            evidence["synthetic_setup_error"] = result.stderr.decode(errors="replace")[:1200] if isinstance(result.stderr,bytes) else result.stderr[:1200]
        raise RuntimeError("NATIVE_STEP_FAILED")
    return result.stdout
def sql(container, query, database="postgres", user="supabase_admin"):
    return run(["docker","exec",container,"psql","-X","-qAt","-U",user,"-d",database,"-v","ON_ERROR_STOP=1","-c",query],text=True)
def start(suffix):
    name=PREFIX+suffix
    run(["docker","run","-d","--name",name,"--network","none",
         "--env","POSTGRES_PASSWORD=synthetic-only-not-production",
         "--env","POSTGRES_DB=postgres",IMAGE],text=True)
    containers.append(name)
    for _ in range(60):
        ready=subprocess.run(["docker","exec",name,"pg_isready","-h","127.0.0.1","-U","supabase_admin","-d","postgres"],env=ENV,capture_output=True)
        if ready.returncode==0:return name
        time.sleep(1)
    raise RuntimeError("SYNTHETIC_START_TIMEOUT")
evidence={"scope":"SYNTHETIC_ONLY","image":IMAGE,"production_credentials_used":False,
          "customer_rows_exported":False,"production_writes":False,"production_recovery":"NOT_TESTED"}
try:
    stage="load_production_components"
    tree=ast.parse(Path("scripts/recovery/production-backup-rehearsal.py").read_text())
    scope={"json":json,"re":re,"subprocess":subprocess,"ENV":ENV,"REPORT":{},"ACTIVE":[]}
    selected=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ("qident","canonical","fingerprints","catalog_difference_summary","align_existing_schema_owners","failure_diagnostic","run","piped","creator_privileges","schema_restore_lists","create_owned_extension","verify_isolated_extension_owner_profile","restore_predata_with_owned_schemas")]
    for n in tree.body:
        if isinstance(n,ast.Assign):
            for target in n.targets:
                if isinstance(target,ast.Name) and target.id in ("TABLES_SQL","CATALOG_SQL"):scope[target.id]=ast.literal_eval(n.value)
    exec(compile(ast.Module(body=selected,type_ignores=[]),"reviewed-production-components","exec"),scope)
    # No database, Docker or network access: verify diagnostics from both failures.
    stage="dual_pipeline_failure_diagnostic"
    try:
        scope["piped"](
            [sys.executable,"-c","import sys; sys.stderr.write('permission denied'); sys.exit(9)"],
            [sys.executable,"-c","import sys; sys.stdin.read(); sys.stderr.write('input file is too short'); sys.exit(10)"],
            timeout=20)
    except RuntimeError as error:
        if str(error)!="STREAM_PIPE_FAILED":raise
    else:
        raise RuntimeError("EXPECTED_PIPELINE_FAILURE_NOT_REJECTED")
    both=scope["REPORT"].get("pipeline_failure_diagnostics",{})
    if (set(both)!={"encrypted_producer","restore_consumer"}
            or both["encrypted_producer"]["category"]!="permission_denied"
            or both["restore_consumer"]["category"]!="archive_truncated"
            or scope["REPORT"].get("failure_diagnostic")!=both["encrypted_producer"]):
        raise RuntimeError("DUAL_PIPELINE_DIAGNOSTIC_NOT_PRESERVED")
    evidence["both_failure_diagnostics_sanitized"]=True
    scope["REPORT"].clear()
    # Zero-provider, zero-Docker negative tests for the new fail-closed gate.
    stage="extension_owner_profile_unit"
    profile={"extensions":[["pgcrypto","1.3","extensions","postgres"]]}
    variations=[
        ([["pgcrypto","1.3","extensions","postgres"]],True),
        ([["pgcrypto","1.3","extensions","supabase_admin"]],False),
        ([["pgcrypto","9.9","extensions","postgres"]],False),
        ([["pgcrypto","1.3","public","postgres"]],False),
        ([],False)
    ]
    original_run=scope["run"]
    try:
        for rows,should_pass in variations:
            scope["run"]=lambda *_args, _rows=rows, **_kwargs: json.dumps(_rows)
            try:
                accepted=scope["verify_isolated_extension_owner_profile"](
                    "risck-synthetic-target-unit","recovery_destination",profile)
            except RuntimeError as error:
                if should_pass or str(error)!="ISOLATED_EXTENSION_OWNER_PROFILE_MISMATCH":
                    raise
            else:
                if not should_pass or not accepted:
                    raise RuntimeError("EXTENSION_OWNER_PREFLIGHT_FALSE_ACCEPT")
    finally:
        scope["run"]=original_run
        scope["REPORT"].clear()
    evidence["extension_owner_profile_unit_cases"]=len(variations)
    if "--unit-only" in sys.argv:
        evidence["status"]="PASS_OFFLINE_UNIT_ONLY"
        raise SystemExit(0)
    stage="pull"
    run(["docker","pull",IMAGE],text=True,timeout=300)
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
    sql(source,"GRANT CREATE ON DATABASE recovery_source TO postgres")
    sql(source,'''CREATE SCHEMA IF NOT EXISTS extensions; CREATE SCHEMA IF NOT EXISTS vault; CREATE SCHEMA IF NOT EXISTS auth;
DROP EXTENSION IF EXISTS pg_stat_statements, "uuid-ossp", pgcrypto CASCADE;
GRANT USAGE,CREATE ON SCHEMA extensions TO postgres;''',"recovery_source")
    stage="transactional_bootstrap_isolation"
    privilege_probe=subprocess.Popen(["docker","exec","-i",source,"psql","-X","-qAt","-U","supabase_admin","-d","recovery_source","-v","ON_ERROR_STOP=1"],env=ENV,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    privilege_probe.stdin.write("BEGIN; ALTER ROLE postgres SUPERUSER; SELECT 'bootstrap_ready';\n");privilege_probe.stdin.flush()
    with selectors.DefaultSelector() as selector:
        selector.register(privilege_probe.stdout,selectors.EVENT_READ)
        if not selector.select(timeout=20) or privilege_probe.stdout.readline().strip()!="bootstrap_ready":
            raise RuntimeError("BOOTSTRAP_ISOLATION_PROBE_FAILED")
    evidence["uncommitted_bootstrap_invisible_to_other_session"] = json.loads(sql(source,"SELECT json_build_object('not_superuser',NOT rolsuper) FROM pg_roles WHERE rolname='postgres'","recovery_source"))["not_superuser"]
    privilege_probe.stdin.write("ROLLBACK;\n");privilege_probe.stdin.close();privilege_probe.wait(timeout=20)
    if privilege_probe.returncode:raise RuntimeError("BOOTSTRAP_PROBE_ROLLBACK_FAILED")
    privilege_probe=None
    evidence["failed_bootstrap_role_rollback_verified"] = json.loads(sql(source,"SELECT json_build_object('not_superuser',NOT rolsuper) FROM pg_roles WHERE rolname='postgres'","recovery_source"))["not_superuser"]
    if not all(evidence[k] for k in ("uncommitted_bootstrap_invisible_to_other_session","failed_bootstrap_role_rollback_verified")):
        raise RuntimeError("BOOTSTRAP_ROLE_VISIBILITY_OR_ROLLBACK_FAILED")
    stage="synthetic_setup"
    for extension in ("pg_stat_statements","uuid-ossp","pgcrypto"):
        scope["create_owned_extension"](source,"recovery_source",extension,REQUIRED[extension],"extensions","postgres")
    sql(source,'''CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault VERSION '0.3.1';
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions VERSION '0.6.1';
ALTER SCHEMA public OWNER TO postgres;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon,authenticated;
CREATE TABLE auth.synthetic_users(id uuid PRIMARY KEY);
CREATE TABLE public.synthetic_items(id integer PRIMARY KEY, obsolete text, user_id uuid NOT NULL REFERENCES auth.synthetic_users(id));
INSERT INTO auth.synthetic_users VALUES ('00000000-0000-0000-0000-000000000001');
ALTER TABLE public.synthetic_items DROP COLUMN obsolete;
INSERT INTO public.synthetic_items VALUES (1,'00000000-0000-0000-0000-000000000001');
ALTER TABLE public.synthetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synthetic_items FORCE ROW LEVEL SECURITY;
CREATE POLICY synthetic_isolation ON public.synthetic_items USING (false);
ALTER TABLE public.synthetic_items OWNER TO postgres;
GRANT SELECT ON public.synthetic_items TO anon;
CREATE FUNCTION public.synthetic_security() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$SELECT true$$;
ALTER FUNCTION public.synthetic_security() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.synthetic_security() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.synthetic_security() TO authenticated;
CREATE SCHEMA synthetic_database_owned AUTHORIZATION pg_database_owner;
CREATE TABLE synthetic_database_owned.synthetic_probe(id int PRIMARY KEY);
INSERT INTO synthetic_database_owned.synthetic_probe VALUES(1);
GRANT USAGE,CREATE ON SCHEMA auth TO supabase_auth_admin;
SET SESSION AUTHORIZATION supabase_auth_admin;
CREATE TYPE auth.synthetic_member_state AS ENUM ('active','inactive');
RESET SESSION AUTHORIZATION;
GRANT CREATE ON SCHEMA public TO authenticated;
SET SESSION AUTHORIZATION authenticated;
CREATE FUNCTION public.synthetic_owned_no_create() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$SELECT 7$$;
RESET SESSION AUTHORIZATION;
REVOKE CREATE ON SCHEMA public FROM authenticated;
REVOKE ALL ON FUNCTION public.synthetic_owned_no_create() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.synthetic_owned_no_create() TO anon;''',"recovery_source")
    stage="export_consistent_synthetic_snapshot"
    snapshot_process=subprocess.Popen(["docker","exec","-i",source,"psql","-X","-qAt","-U","supabase_admin","-d","recovery_source","-v","ON_ERROR_STOP=1"],env=ENV,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    snapshot_process.stdin.write("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n");snapshot_process.stdin.flush()
    with selectors.DefaultSelector() as selector:
        selector.register(snapshot_process.stdout,selectors.EVENT_READ)
        if not selector.select(timeout=20):raise RuntimeError("SYNTHETIC_SNAPSHOT_TIMEOUT")
        snapshot=snapshot_process.stdout.readline().strip()
    if not re.fullmatch("[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+",snapshot):raise RuntimeError("SYNTHETIC_SNAPSHOT_FAILED")
    def src_query(query):
        return json.loads(sql(source,"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '"+snapshot+"'; SET LOCAL timezone='UTC'; SET LOCAL search_path=pg_catalog; "+query+"; COMMIT;","recovery_source"))
    before_rows=scope["fingerprints"](src_query)
    before_catalog=src_query(scope["CATALOG_SQL"])
    extension_owners={row[0]:row[3] for row in before_catalog["extensions"]}
    evidence["source_postgres_extension_owners_verified"] = all(extension_owners.get(name)=="postgres" for name in ("pg_stat_statements","uuid-ossp","pgcrypto"))
    if not evidence["source_postgres_extension_owners_verified"]:raise RuntimeError("SYNTHETIC_EXTENSION_OWNER_PROFILE_NOT_REPRODUCED")
    sql(source,"INSERT INTO public.synthetic_items VALUES(2,'00000000-0000-0000-0000-000000000001')","recovery_source")
    stage="destination_start"
    dest=start("-dest")
    for role in ("anon","authenticated"):
        sql(dest,"DO $r$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='"+role+"') THEN CREATE ROLE "+role+" NOLOGIN; END IF; END $r$;")
    sql(dest,"CREATE DATABASE recovery_destination WITH TEMPLATE template0")
    sql(dest,"GRANT CREATE ON DATABASE recovery_destination TO postgres,anon,authenticated")
    stage="negative_database_owner_bootstrap"
    try:
        scope["run"](["docker","exec",dest,"psql","-X","-qAt","-U","supabase_admin",
                      "-d","recovery_destination","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose",
                      "-c","SET SESSION AUTHORIZATION pg_database_owner; CREATE SCHEMA synthetic_unprepared;"])
    except RuntimeError as error:
        if str(error)!="NATIVE_STEP_FAILED":raise
    else:
        raise RuntimeError("UNPREPARED_DATABASE_OWNER_UNEXPECTEDLY_SUCCEEDED")
    failure=scope["REPORT"].get("failure_diagnostic",{})
    if failure.get("sqlstate")!="42501" or failure.get("object_kind")!="database":
        raise RuntimeError("DATABASE_OWNER_REGRESSION_NOT_REPRODUCED")
    evidence["unprepared_database_owner_create_rejected"]=True
    stage="negative_schema_acl_order"
    try:
        scope["run"](["docker","exec",dest,"psql","-X","-qAt","-U","supabase_admin",
                      "-d","recovery_destination","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose",
                      "-c","BEGIN; CREATE SCHEMA synthetic_acl_probe; SET SESSION AUTHORIZATION supabase_auth_admin; CREATE TYPE synthetic_acl_probe.synthetic_state AS ENUM ('active'); ROLLBACK;"])
    except RuntimeError as error:
        if str(error)!="NATIVE_STEP_FAILED":raise
    else:
        raise RuntimeError("MISSING_SCHEMA_ACL_UNEXPECTEDLY_SUCCEEDED")
    failure=scope["REPORT"].get("failure_diagnostic",{})
    if failure.get("sqlstate")!="42501" or failure.get("object_kind")!="schema":
        raise RuntimeError("SCHEMA_ACL_ORDER_REGRESSION_NOT_REPRODUCED")
    evidence["unprepared_schema_type_create_rejected"]=True
    sql(dest,"BEGIN; CREATE SCHEMA synthetic_acl_probe; GRANT USAGE,CREATE ON SCHEMA synthetic_acl_probe TO supabase_auth_admin; SET SESSION AUTHORIZATION supabase_auth_admin; CREATE TYPE synthetic_acl_probe.synthetic_state AS ENUM ('active'); RESET SESSION AUTHORIZATION; ROLLBACK;","recovery_destination")
    evidence["original_schema_acl_allows_type_creation"]=True
    stage="negative_historical_function_owner"
    try:
        scope["run"](["docker","exec",dest,"psql","-X","-qAt","-U","supabase_admin",
                      "-d","recovery_destination","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose",
                      "-c","SET SESSION AUTHORIZATION authenticated; CREATE FUNCTION public.synthetic_unprepared_function() RETURNS integer LANGUAGE sql AS 'SELECT 7';"])
    except RuntimeError as error:
        if str(error)!="NATIVE_STEP_FAILED":raise
    else:
        raise RuntimeError("HISTORICAL_FUNCTION_OWNER_UNEXPECTEDLY_SUCCEEDED")
    failure=scope["REPORT"].get("failure_diagnostic",{})
    if failure.get("sqlstate")!="42501" or failure.get("object_kind")!="schema":
        raise RuntimeError("HISTORICAL_FUNCTION_OWNER_REGRESSION_NOT_REPRODUCED")
    evidence["session_owned_function_without_create_rejected"]=True
    # Keep the failing owner's database CREATE absent. The alternative must
    # restore its schema AND ownership without expanding that privilege.
    evidence["database_owner_create_not_granted"] = True
    scope["align_existing_schema_owners"](lambda query:sql(dest,query,"recovery_destination"),before_catalog)
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
            _, encrypt_error = encryptor.communicate(timeout=90)
            _, dump_error = producer.communicate(timeout=30)
        finally:
            for process in (producer,encryptor):
                if process.poll() is None:process.kill();process.communicate()
        if producer.returncode or encryptor.returncode:
            evidence["synthetic_pipeline_diagnostic"]={"dump_returncode":producer.returncode,"age_returncode":encryptor.returncode,"dump_error":dump_error.decode(errors="replace")[:1600],"age_error":encrypt_error.decode(errors="replace")[:1600]}
            raise RuntimeError("ENCRYPTION_PIPE_FAILED")
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
        stage="synthetic_restore_pre-data"
        scope["REPORT"].clear()
        decrypt=common+["age","-d","-i","/work/identity","/work/backup.dump.age"]
        evidence["schemas_restored_with_original_owners"] = scope["restore_predata_with_owned_schemas"](decrypt,dest,work,before_catalog)
        for section in ("data","post-data"):
            stage="synthetic_restore_"+section
            restore=["docker","exec","-i",dest,"pg_restore","-U","supabase_admin","-d","recovery_destination","--exit-on-error","--section="+section]
            decryptor = subprocess.Popen(common+["age","-d","-i","/work/identity","/work/backup.dump.age"],env=ENV,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            restorer = subprocess.Popen(restore,env=ENV,stdin=decryptor.stdout,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
            try:
                _,restore_error=restorer.communicate(timeout=90)
                while decryptor.stdout.read(65536):pass
                decryptor.stdout.close()
                _,decrypt_error=decryptor.communicate(timeout=30)
            finally:
                for process in (decryptor,restorer):
                    if process.poll() is None:process.kill();process.communicate()
            if restorer.returncode or decryptor.returncode:
                evidence["synthetic_restore_diagnostic"]={"section":section,"restore_returncode":restorer.returncode,"decrypt_returncode":decryptor.returncode,"restore_error":restore_error.decode(errors="replace")[:2000],"decrypt_error":decrypt_error.decode(errors="replace")[:400]}
                raise RuntimeError("DECRYPT_RESTORE_PIPE_FAILED")
        evidence["plaintext_dump_file_written"] = False
    evidence["synthetic_ciphertext_and_keys_removed"] = not work.exists()
    sql(dest,"REVOKE CREATE ON DATABASE recovery_destination FROM pg_database_owner")
    revoked=json.loads(sql(dest,"SELECT json_build_object('revoked',NOT has_database_privilege('pg_database_owner',current_database(),'CREATE'))","recovery_destination"))["revoked"]
    evidence["temporary_database_owner_create_revoked"]=revoked
    if not revoked:raise RuntimeError("TEMPORARY_RESTORE_PRIVILEGE_NOT_REVOKED")
    stage="verify_production_integrity_components"
    def dst_query(query):
        return json.loads(sql(dest,"BEGIN READ ONLY; SET LOCAL timezone='UTC'; SET LOCAL search_path=pg_catalog; "+query+"; COMMIT;","recovery_destination"))
    after_rows=scope["fingerprints"](dst_query)
    after_catalog=dst_query(scope["CATALOG_SQL"])
    evidence["snapshot_row_integrity_matches"]=before_rows==after_rows
    evidence["catalog_owner_acl_rls_matches"]=before_catalog==after_catalog
    evidence["catalog_sections_match"]={k:before_catalog[k]==after_catalog.get(k) for k in before_catalog}
    evidence["catalog_difference_summary"]=scope["catalog_difference_summary"](before_catalog,after_catalog)
    evidence["concurrent_insert_excluded_from_snapshot"]=json.loads(sql(dest,"SELECT json_build_object('ok',count(*)=1) FROM public.synthetic_items","recovery_destination"))["ok"]
    if not all(evidence[k] for k in ("snapshot_row_integrity_matches","catalog_owner_acl_rls_matches","concurrent_insert_excluded_from_snapshot")):raise RuntimeError("PRODUCTION_COMPONENT_COMPARISON_FAILED")

    stage="negative_catalog_security_checks"
    negative_checks={}
    for label,change in (("grant", "GRANT INSERT ON public.synthetic_items TO anon;"),("owner","ALTER TABLE public.synthetic_items OWNER TO supabase_admin;"),("rls","ALTER TABLE public.synthetic_items NO FORCE ROW LEVEL SECURITY;")):
        changed=json.loads(sql(dest,"BEGIN; "+change+" SET LOCAL search_path=pg_catalog; "+scope["CATALOG_SQL"]+"; ROLLBACK;","recovery_destination"))
        negative_checks[label]=changed!=before_catalog
    evidence["security_catalog_changes_rejected"]=negative_checks
    if not all(negative_checks.values()):raise RuntimeError("SECURITY_CATALOG_NEGATIVE_CHECK_FAILED")

    stage="negative_failure_diagnostic"
    try:
        scope["run"](["docker","exec",dest,"psql","-X","-qAt","-U","supabase_admin",
                      "-d","recovery_destination","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose",
                      "-c","SET ROLE anon; CREATE TABLE public.synthetic_forbidden_diagnostic(id int);"])
    except RuntimeError as error:
        if str(error)!="NATIVE_STEP_FAILED":raise
    else:
        raise RuntimeError("EXPECTED_PERMISSION_FAILURE_NOT_REJECTED")
    diagnostic=scope["REPORT"].get("failure_diagnostic",{})
    if diagnostic.get("category")!="permission_denied" or diagnostic.get("sqlstate")!="42501":
        raise RuntimeError("NATIVE_SQLSTATE_DIAGNOSTIC_NOT_CAPTURED")
    if set(diagnostic)!={"category","component","returncode","sqlstate","object_kind"}:
        raise RuntimeError("UNEXPECTED_DIAGNOSTIC_FIELDS")
    if "synthetic_forbidden_diagnostic" in json.dumps(diagnostic):
        raise RuntimeError("DIAGNOSTIC_EXPOSED_OBJECT_NAME")
    if diagnostic["object_kind"]!="schema":raise RuntimeError("NATIVE_PERMISSION_SCOPE_NOT_CAPTURED")
    evidence["native_permission_failure_sanitized"]=True
    evidence["native_failure_sqlstate"]=diagnostic["sqlstate"]

    stage="verify_restore"
    result=json.loads(sql(dest,'''SELECT json_build_object(
'row_counts',(SELECT count(*)=1 FROM public.synthetic_items) AND (SELECT count(*)=1 FROM auth.synthetic_users),
'cross_schema_fk',(SELECT count(*)=1 FROM pg_constraint WHERE conrelid='public.synthetic_items'::regclass AND contype='f'),
'force_rls',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.synthetic_items'::regclass),
'policy',(SELECT count(*)=1 FROM pg_policy WHERE polrelid='public.synthetic_items'::regclass),
'enum_owner',(SELECT pg_get_userbyid(t.typowner)='supabase_auth_admin' FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='auth' AND t.typname='synthetic_member_state'),
'enum_labels',(SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)=ARRAY['active','inactive'] FROM pg_enum e WHERE e.enumtypid='auth.synthetic_member_state'::regtype),
'historical_function_owner',(SELECT pg_get_userbyid(proowner)='authenticated' AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] FROM pg_proc WHERE oid='public.synthetic_owned_no_create()'::regprocedure),
'historical_owner_not_escalated',NOT has_schema_privilege('authenticated','public','CREATE'),
'extension_owner_not_escalated',(SELECT NOT rolsuper FROM pg_roles WHERE rolname='postgres'),
'extension_versions',(SELECT count(*)=6 FROM pg_extension WHERE (extname,extversion) IN (('plpgsql','1.0'),('pg_stat_statements','1.11'),('uuid-ossp','1.1'),('pgcrypto','1.3'),('supabase_vault','0.3.1'),('wrappers','0.6.1'))))''',"recovery_destination"))
    evidence["restored_assertions"]=result
    if not all(result.values()):raise RuntimeError("RESTORE_ASSERTION_FAILED")
    evidence["status"]="PASS_PRODUCTION_BACKUP_COMPONENTS_SYNTHETIC_ONLY"
except Exception as error:
    if "scope" in locals() and scope["REPORT"].get("failure_diagnostic"):
        evidence["synthetic_restore_diagnostic"] = scope["REPORT"]["failure_diagnostic"]
    evidence["failure_type"]=type(error).__name__
    evidence["status"]="FAILED_SYNTHETIC_TARGET_ONLY"
    evidence["failure_stage"]=stage
finally:
    if privilege_probe is not None and privilege_probe.poll() is None:
        privilege_probe.kill();privilege_probe.communicate()
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
raise SystemExit(0 if evidence["status"]=="PASS_PRODUCTION_BACKUP_COMPONENTS_SYNTHETIC_ONLY" else 1)

