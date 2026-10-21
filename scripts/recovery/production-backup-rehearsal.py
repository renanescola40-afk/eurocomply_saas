"""Approval-gated encrypted logical backup and isolated restore. No production writes."""
import base64, hashlib, importlib.util, json, os, re, selectors, shutil
import subprocess, tempfile, time
from pathlib import Path

PROJECT = "tganhbbhfxcpblmgqprg"
HOST = "aws-0-eu-west-1.pooler.supabase.com"
OWNER_RECIPIENT = "age1d8zgu9c38njefxj528kfucns2e2pxu0zqyzcjrjj475l9652afxs8xfcqy"
SERVER_IMAGE = "supabase/postgres:17.6.1.127"
CLIENT_IMAGE = "postgres:17.6"
BRANCH = "ci/verify-recovery-production-20261019"
EXPECTED_ROLES = {"anon","authenticated","authenticator","dashboard_user","postgres","service_role","supabase_admin","supabase_auth_admin","supabase_etl_admin","supabase_privileged_role","supabase_read_only_user","supabase_realtime_admin","supabase_replication_admin","supabase_storage_admin"}
ENV = {k:os.environ[k] for k in ("PATH","HOME") if k in os.environ}
OUT = Path("artifacts/recovery")
OUT.mkdir(parents=True, exist_ok=True)
REPORT = {"status":"NOT_STARTED","scope":"LOGICAL_DATABASE_ONLY","owner_recipient":OWNER_RECIPIENT,
          "production_writes":False,"production_migrations":False,"customer_rows_in_logs":False,
          "plaintext_dump_file_written":False,"owner_private_key_sent_to_ci":False,
          "full_platform_recovery":"NOT_TESTED","production_go":"NO_GO"}
ACTIVE = []
TARGET = None
SNAPSHOT_PROCESS = None
STAGE = "input_guard"

def failure_diagnostic(stderr, returncode, component):
    # Publish only fixed categories and PostgreSQL SQLSTATE, never raw stderr.
    message = stderr.decode("utf-8", errors="replace") if isinstance(stderr, bytes) else (stderr or "")
    patterns = (
        ("session_authorization_denied", r"(?:permission denied to set session authorization|cannot set session authorization)"),
        ("superuser_required", r"(?:must be superuser|superuser privileges)"),
        ("ownership_required", r"must be owner of"),
        ("permission_denied", r"permission denied"),
        ("role_missing", r"role .+ does not exist"),
        ("schema_exists", r"schema .+ already exists"),
        ("relation_exists", r"relation .+ already exists"),
        ("extension_unavailable", r"extension .+ is not available"),
        ("duplicate_object", r"already exists"),
        ("archive_truncated", r"(?:unexpected end of file|end of file|input file is too short)"),
        ("connection_failed", r"(?:could not connect|connection refused|connection.*failed)"),
    )
    category = next((name for name, pattern in patterns if re.search(pattern, message, re.IGNORECASE)), "unclassified_native_failure")
    sqlstate = re.search(r"(?:ERROR|FATAL):\s+([0-9A-Z]{5}):", message)
    diagnostic = {"category": category, "component": component, "returncode": returncode}
    object_kind = re.search(r"permission denied (?:for|to create) (schema|table|relation|sequence|function|extension|language|database)\b", message, re.IGNORECASE)
    if object_kind:
        diagnostic["object_kind"] = object_kind.group(1).lower()
    denied_database = re.search(r'permission denied for database (?:"([^"\r\n]+)"|([^\s;]+))', message, re.IGNORECASE)
    if denied_database:
        database = denied_database.group(1) or denied_database.group(2)
        diagnostic["database_scope"] = {"recovery_destination":"isolated_target","postgres":"bootstrap_database"}.get(database,"other_database")
    for operation in ("CREATE TABLE", "CREATE FUNCTION", "CREATE SCHEMA", "CREATE EXTENSION", "CREATE SEQUENCE", "CREATE VIEW", "CREATE TYPE", "ALTER TABLE", "COMMENT ON", "SET SESSION AUTHORIZATION"):
        if re.search(r"Command was:\s*" + re.escape(operation) + r"\b", message, re.IGNORECASE):
            diagnostic["operation"] = operation
            break
    if sqlstate:
        diagnostic["sqlstate"] = sqlstate.group(1)
    return diagnostic

def run(args, *, data=None, text=False, timeout=120, **kwargs):
    result = subprocess.run(args, input=data, text=text, capture_output=True,
                            env=ENV, timeout=timeout, **kwargs)
    if result.returncode:
        REPORT["failure_diagnostic"] = failure_diagnostic(result.stderr, result.returncode, "native_command")
        raise RuntimeError("NATIVE_STEP_FAILED")
    return result.stdout

def qident(value):
    return '"' + value.replace('"','""') + '"'

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",",":"), ensure_ascii=False).encode()

def creator_privileges(query, roles):
    names = ",".join("'" + role.replace("'", "''") + "'" for role in sorted(roles))
    return json.loads(query("SELECT json_build_object('checked',count(*),'prepared',count(*) FILTER (WHERE has_database_privilege(oid,current_database(),'CREATE'))) FROM pg_roles WHERE rolname IN ("+names+")"))

def piped(producer_args, consumer_args, timeout=180, drain_remaining=False, capture_stdout=False):
    producer = subprocess.Popen(producer_args, env=ENV, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    consumer = subprocess.Popen(consumer_args, env=ENV, stdin=producer.stdout,
                                stdout=subprocess.PIPE if capture_stdout else subprocess.DEVNULL, stderr=subprocess.PIPE)
    ACTIVE.extend([producer,consumer])
    if not drain_remaining:producer.stdout.close()
    try:
        consumer_output, consumer_error = consumer.communicate(timeout=timeout)
        if drain_remaining:
            while producer.stdout.read(65536):pass
            producer.stdout.close()
        _, producer_error = producer.communicate(timeout=30)
    finally:
        for process in (producer,consumer):
            if process.poll() is None:process.kill();process.communicate()
            ACTIVE.remove(process)
    if producer.returncode or consumer.returncode:
        failed = (consumer_error, consumer.returncode, "restore_consumer") if consumer.returncode else (producer_error, producer.returncode, "encrypted_producer")
        REPORT["failure_diagnostic"] = failure_diagnostic(*failed)
        raise RuntimeError("STREAM_PIPE_FAILED")
    return consumer_output

def schema_restore_lists(toc):
    # Metadata stays private; preserve every TOC entry exactly once.
    schemas, schema_acls, extensions, remaining = [], [], [], []
    for line in toc.decode("utf-8").splitlines(keepends=True):
        if line.startswith(";") or not line.strip():
            schemas.append(line);schema_acls.append(line);extensions.append(line);remaining.append(line)
        elif re.match(r"^\d+;\s+\d+\s+\d+\s+SCHEMA\s",line):
            schemas.append(line)
        elif re.match(r"^\d+;\s+\d+\s+\d+\s+ACL\s+-\s+SCHEMA\s",line):
            schema_acls.append(line)
        elif re.match(r"^\d+;\s+\d+\s+\d+\s+EXTENSION\s",line):
            extensions.append(line)
        else:
            remaining.append(line)
    count = sum(bool(re.match(r"^\d+;",line)) for line in schemas)
    if count == 0:raise RuntimeError("RESTORE_SCHEMA_TOC_EMPTY")
    return "".join(schemas).encode(), "".join(schema_acls).encode(), "".join(extensions).encode(), "".join(remaining).encode(), count

def create_owned_extension(target, database, extension, version, namespace, owner):
    if not target.startswith(("risck-real-isolated-restore-","risck-synthetic-target-")) or database not in {"recovery_source","recovery_destination"}:
        raise RuntimeError("EXTENSION_BOOTSTRAP_TARGET_REJECTED")
    if owner not in {"postgres","supabase_admin"}:
        raise RuntimeError("UNREVIEWED_EXTENSION_OWNER")
    if run(["docker","inspect","--format","{{.HostConfig.NetworkMode}}",target],text=True).strip() != "none":
        raise RuntimeError("EXTENSION_BOOTSTRAP_NETWORK_REJECTED")
    create = ("CREATE EXTENSION IF NOT EXISTS "+qident(extension)+" WITH SCHEMA "+qident(namespace)+
              " VERSION '"+version.replace("'","''")+"';")
    # An already-privileged local administrator bootstraps the snapshot owner
    # in one transaction. No other session observes an elevated postgres role;
    # both success and failure leave its committed NOSUPERUSER state intact.
    guard = "DO $guard$ BEGIN IF current_user <> 'supabase_admin' OR NOT (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) OR (SELECT rolsuper FROM pg_roles WHERE rolname='postgres') THEN RAISE EXCEPTION 'ISOLATED_ROLE_PROFILE_REJECTED'; END IF; END $guard$;"
    statement = "BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'; "+guard
    if owner == "postgres":
        statement += " ALTER ROLE postgres SUPERUSER; SET SESSION AUTHORIZATION postgres; "+create+" RESET SESSION AUTHORIZATION; ALTER ROLE postgres NOSUPERUSER; "
    else:
        statement += create
    statement += guard+" COMMIT;"
    run(["docker","exec",target,"psql","-X","-qAt","-U","supabase_admin","-d",database,"-v","ON_ERROR_STOP=1","-c",statement])

def restore_predata_with_owned_schemas(decrypt, target, private_work, catalog):
    base = ["docker","exec","-i",target,"pg_restore","-U","supabase_admin"]
    toc = piped(decrypt,base+["--list"],drain_remaining=True,capture_stdout=True)
    schemas, schema_acls, extensions, remaining, count = schema_restore_lists(toc)
    for name, content in (("schemas",schemas),("schema-acls",schema_acls),("extensions",extensions),("objects",remaining)):
        if name == "extensions":
            # pg_dump does not record an EXTENSION owner in its TOC. Create
            # with the snapshot owner/version before archive IF NOT EXISTS.
            for extension, version, namespace, owner in catalog["extensions"]:
                create_owned_extension(target,"recovery_destination",extension,version,namespace,owner)
        metadata = private_work/("restore-"+name+".toc")
        metadata.write_bytes(content);metadata.chmod(0o600)
        destination = "/tmp/risck-restore-"+name+".toc"
        run(["docker","cp",str(metadata),target+":"+destination])
        restore = base+["-d","recovery_destination","--exit-on-error","--use-list="+destination]
        # Standard ALTER OWNER retains ownership without requiring historical
        # owners to retain DDL privileges. Extensions have no ALTER OWNER form.
        # No --no-owner, ACL/RLS exclusion or committed privilege expansion.
        # Original schema ACLs must precede CREATE TYPE/TABLE by a distinct
        # source owner. Apply only the archived grants, no bootstrap expansion.
        if name in ("extensions","objects"):restore.append("--section=pre-data")
        if name == "extensions":restore.append("--use-set-session-authorization")
        piped(decrypt,restore,drain_remaining=True)
        metadata.unlink()
    return count

TABLES_SQL = """SELECT coalesce(json_agg(json_build_array(n.nspname,c.relname) ORDER BY n.nspname,c.relname),'[]'::json)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
AND (NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
 OR c.oid IN (SELECT unnest(extconfig) FROM pg_extension WHERE extconfig IS NOT NULL))"""

CATALOG_SQL = """SELECT json_build_object(
'extensions',(SELECT json_agg(json_build_array(e.extname,e.extversion,n.nspname,pg_get_userbyid(e.extowner)) ORDER BY e.extname) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
'schemas',(SELECT json_agg(json_build_array(nspname,pg_get_userbyid(nspowner),
 (SELECT array_agg(a::text ORDER BY a::text) FROM unnest(nspacl) a)) ORDER BY nspname)
 FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'),
'relations',(SELECT json_agg(json_build_array(n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner),
 c.relrowsecurity,c.relforcerowsecurity,(SELECT array_agg(a::text ORDER BY a::text) FROM unnest(c.relacl) a)) ORDER BY n.nspname,c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%'
 AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','S','v','m','f')),
'columns',(SELECT json_agg(json_build_array(n.nspname,c.relname,(SELECT count(*) FROM pg_attribute prior WHERE prior.attrelid=a.attrelid AND prior.attnum>0 AND prior.attnum<=a.attnum AND NOT prior.attisdropped),a.attname,
 format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,
 pg_get_expr(d.adbin,d.adrelid)) ORDER BY n.nspname,c.relname,a.attnum)
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p','v','m','f')
 AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
'constraints',(SELECT json_agg(json_build_array(n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid,true),k.convalidated)
 ORDER BY n.nspname,c.relname,k.conname) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
'policies',(SELECT json_agg(json_build_array(n.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,
 (SELECT array_agg(CASE WHEN r=0 THEN 'public' ELSE pg_get_userbyid(r)::text END ORDER BY rname) FROM
 (SELECT r,CASE WHEN r=0 THEN 'public' ELSE pg_get_userbyid(r)::text END AS rname FROM unnest(p.polroles) r) roles),
 pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))
 ORDER BY n.nspname,c.relname,p.polname) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
'functions',(SELECT json_agg(json_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),
 pg_get_userbyid(p.proowner),p.prosecdef,p.proleakproof,p.proconfig,
 (SELECT array_agg(a::text ORDER BY a::text) FROM unnest(p.proacl) a),pg_get_functiondef(p.oid))
 ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT LIKE 'pg_%'
 AND n.nspname<>'information_schema' AND p.prokind IN ('f','p')
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')),
'triggers',(SELECT json_agg(json_build_array(n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true))
 ORDER BY n.nspname,c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname NOT LIKE 'pg_%'
 AND n.nspname<>'information_schema'),
'event_triggers',(SELECT json_agg(json_build_array(evtname,evtevent,evtfoid::regprocedure::text,evtenabled,evttags)
 ORDER BY evtname) FROM pg_event_trigger),
'default_acls',(SELECT json_agg(json_build_array(pg_get_userbyid(d.defaclrole),coalesce(n.nspname,''),d.defaclobjtype,
 (SELECT array_agg(a::text ORDER BY a::text) FROM unnest(d.defaclacl) a)) ORDER BY pg_get_userbyid(d.defaclrole),coalesce(n.nspname,''),d.defaclobjtype)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace))"""

def fingerprints(query):
    relations = query(TABLES_SQL)
    if not relations:raise RuntimeError("NO_LOGICAL_TABLES")
    rows = []
    for start in range(0,len(relations),16):
        selects=[]
        for schema,table in relations[start:start+16]:
            name=qident(schema)+"."+qident(table)
            sl="'"+schema.replace("'","''")+"'"
            tl="'"+table.replace("'","''")+"'"
            digest="encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')"
            selects.append("SELECT json_build_array("+sl+","+tl+",count(*),encode(sha256(convert_to(coalesce(string_agg("+digest+",'' ORDER BY "+digest+"),''),'UTF8')),'hex')) AS x FROM "+name+" t")
        batch=query("SELECT json_agg(x ORDER BY x->>0,x->>1) FROM ("+" UNION ALL ".join(selects)+") fingerprints")
        if not isinstance(batch,list):raise RuntimeError("INVALID_FINGERPRINT_RESULT")
        for row in batch:
            if len(row)!=4 or type(row[2]) is not int or not re.fullmatch("[0-9a-f]{64}",row[3]):
                raise RuntimeError("INVALID_FINGERPRINT_RESULT")
        rows.extend(batch)
    return sorted(rows,key=lambda r:(r[0],r[1]))


def catalog_difference_summary(before, after):
    keys={"extensions":1,"schemas":1,"relations":2,"columns":4,"constraints":3,"policies":3,"functions":3,"triggers":3,"event_triggers":1,"default_acls":3}
    result={}
    for section,size in keys.items():
        left={canonical([row[0],row[1],row[3]] if section=="columns" else row[:size]):row for row in (before.get(section) or [])}
        right={canonical([row[0],row[1],row[3]] if section=="columns" else row[:size]):row for row in (after.get(section) or [])}
        fields={}
        for key in left.keys() & right.keys():
            for i,(a,b) in enumerate(zip(left[key],right[key])):
                if a!=b: fields[str(i)]=fields.get(str(i),0)+1
        result[section]={"source_records":len(left),"restored_records":len(right),"only_source":len(left.keys()-right.keys()),"only_restored":len(right.keys()-left.keys()),"differing_field_counts":fields}
    return result


def align_existing_schema_owners(target_sql, catalog):
    existing=json.loads(target_sql("SELECT coalesce(json_agg(nspname),'[]'::json) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'"))
    for name,owner,_acl in (catalog["schemas"] or []):
        if name in existing:
            target_sql("ALTER SCHEMA "+qident(name)+" OWNER TO "+qident(owner))

def main():
    global TARGET, SNAPSHOT_PROCESS, STAGE
    if os.environ.get("CIRCLE_BRANCH") != BRANCH:raise RuntimeError("BRANCH_GUARD_FAILED")
    spec=importlib.util.spec_from_file_location("preflight",Path(__file__).with_name("connection-preflight.py"))
    preflight=importlib.util.module_from_spec(spec);spec.loader.exec_module(preflight)
    host,user,password,ca=preflight.inputs(os.environ)
    if host != HOST or user != "postgres."+PROJECT:raise RuntimeError("SOURCE_PIN_FAILED")
    for key in ("RISCK_SOURCE_DB_PASSWORD","RISCK_SOURCE_DATABASE_URL","PGPASSWORD","PGSERVICE"):
        os.environ.pop(key,None)
    with tempfile.TemporaryDirectory(prefix="risck-approved-recovery-") as tmp:
        work=Path(tmp);work.chmod(0o700)
        creds=work/"source";creds.mkdir(mode=0o700)
        crypto=work/"crypto";crypto.mkdir(mode=0o700)
        build=work/"build";build.mkdir()
        (build/"Dockerfile").write_text("FROM postgres:17.6\nRUN apt-get update && apt-get install -y --no-install-recommends age && rm -rf /var/lib/apt/lists/*\n")
        tools="risck-approved-recovery-tools:"+str(os.getpid())
        STAGE="build_trusted_tools"
        run(["docker","build","--pull","-t",tools,str(build)],timeout=300)
        run(["docker","pull",SERVER_IMAGE],timeout=300)
        uidgid=str(os.getuid())+":"+str(os.getgid())
        (creds/"passwd").write_text("root:x:0:0:root:/tmp:/bin/false\nrecovery:x:"+str(os.getuid())+":"+str(os.getgid())+":recovery:/tmp:/bin/false\n")
        (creds/"group").write_text("root:x:0:\nrecovery:x:"+str(os.getgid())+":\n")
        (creds/"passwd").chmod(0o444);(creds/"group").chmod(0o444)
        identity_mounts=["--mount",f"type=bind,src={creds/'passwd'},dst=/etc/passwd,readonly",
                         "--mount",f"type=bind,src={creds/'group'},dst=/etc/group,readonly"]
        base=["docker","run","--rm","-i","--read-only","--cap-drop=ALL",
              "--security-opt=no-new-privileges","--user",uidgid]+identity_mounts
        age=base+["--network","none","--mount",f"type=bind,src={crypto},dst=/work",tools]
        if run(age+["age","--version"],text=True).strip()!="1.2.1":raise RuntimeError("AGE_VERSION_NOT_PINNED")
        STAGE="ephemeral_restore_key"
        run(age+["age-keygen","-o","/work/ephemeral-identity"])
        ephemeral=run(age+["age-keygen","-y","/work/ephemeral-identity"],text=True).strip()
        if not re.fullmatch(r"age1[0-9a-z]+",ephemeral):raise RuntimeError("RECIPIENT_PARSE_FAILED")
        fd=os.open(creds/"source.pgpass",os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,"w") as f:
            f.write(":".join(map(preflight.pg_escape,(host,"5432","postgres",user,password)))+"\n")
        password=None
        (creds/"source-ca.pem").write_text(ca);(creds/"source-ca.pem").chmod(0o400)
        source=base+["--network","host","--mount",f"type=bind,src={creds},dst=/run/risck,readonly",
                     "--tmpfs","/tmp:rw,noexec,nosuid,size=8m"]
        fields={"PGHOST":host,"PGPORT":"5432","PGUSER":user,"PGDATABASE":"postgres",
                "PGPASSFILE":"/run/risck/source.pgpass","PGSSLMODE":"verify-full",
                "PGSSLROOTCERT":"/run/risck/source-ca.pem","PGCONNECT_TIMEOUT":"10",
                "PGAPPNAME":"risck-approved-encrypted-backup",
                "PGOPTIONS":"-c default_transaction_read_only=on -c statement_timeout=60000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=600000"}
        for k,v in fields.items():source+=["--env",k+"="+v]
        source+=[tools]
        psql=["psql","-X","-qAt","--no-password","-v","ON_ERROR_STOP=1"]
        STAGE="readonly_snapshot"
        SNAPSHOT_PROCESS=subprocess.Popen(source+psql,env=ENV,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        SNAPSHOT_PROCESS.stdin.write("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n")
        SNAPSHOT_PROCESS.stdin.flush()
        with selectors.DefaultSelector() as selector:
            selector.register(SNAPSHOT_PROCESS.stdout,selectors.EVENT_READ)
            if not selector.select(timeout=20):raise RuntimeError("SNAPSHOT_TIMEOUT")
            snapshot=SNAPSHOT_PROCESS.stdout.readline().strip()
        if not re.fullmatch("[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+",snapshot):raise RuntimeError("SNAPSHOT_NOT_ACCEPTED")
        def src(query):
            statement="BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '"+snapshot+"'; SET LOCAL timezone='UTC'; SET LOCAL search_path=pg_catalog; "+query+"; COMMIT;"
            return json.loads(run(source+psql+["-c",statement],text=True))
        eligibility=src("SELECT json_build_object('read_only',current_setting('transaction_read_only')='on','server_major',current_setting('server_version_num')::int/10000,'roles',(SELECT json_agg(rolname ORDER BY rolname) FROM pg_roles WHERE rolname NOT LIKE 'pg_%'))")
        if eligibility.get("read_only") is not True or eligibility.get("server_major")!=17:raise RuntimeError("SOURCE_READONLY_OR_MAJOR_FAILED")
        if set(eligibility["roles"])!=EXPECTED_ROLES:raise RuntimeError("SOURCE_ROLE_PROFILE_DRIFT")
        STAGE="snapshot_integrity_fingerprints"
        before_rows=fingerprints(src)
        before_catalog=src(CATALOG_SQL)
        REPORT["source_table_count"]=len(before_rows)
        REPORT["source_integrity_sha256"]=hashlib.sha256(canonical(before_rows)).hexdigest()
        REPORT["source_catalog_sha256"]=hashlib.sha256(canonical(before_catalog)).hexdigest()
        STAGE="encrypted_source_dump"
        piped(source+["pg_dump","--format=custom","--snapshot="+snapshot,"--lock-wait-timeout=5000"],
              age+["age","-r",OWNER_RECIPIENT,"-r",ephemeral,"-o","/work/backup.partial.age"])
        SNAPSHOT_PROCESS.stdin.write("COMMIT;\n");SNAPSHOT_PROCESS.stdin.close()
        SNAPSHOT_PROCESS.wait(timeout=20)
        if SNAPSHOT_PROCESS.returncode:raise RuntimeError("SNAPSHOT_CLOSE_FAILED")
        SNAPSHOT_PROCESS=None
        (creds/"source.pgpass").unlink()
        REPORT["source_credential_file_removed_before_restore"]=True
        partial=crypto/"backup.partial.age"
        if not partial.is_file() or partial.stat().st_size==0:raise RuntimeError("NO_CIPHERTEXT")
        backup=OUT/"backup.dump.age"
        if backup.exists():raise RuntimeError("OUTPUT_ALREADY_EXISTS")
        shutil.copyfile(partial,backup);backup.chmod(0o600)
        checksum=hashlib.sha256(backup.read_bytes()).hexdigest()
        (OUT/"backup.dump.age.sha256").write_text(checksum+"  backup.dump.age\n")
        run(["sha256sum","--check","backup.dump.age.sha256"],cwd=OUT)
        REPORT.update({"encrypted_backup_created":True,"ciphertext_sha256":checksum,
                       "ciphertext_bytes":backup.stat().st_size,"owner_recipient_included":True,
                       "ownership_and_acls_in_dump":True,"client_tls_verify_full":True,"source_read_only":True})
        STAGE="isolated_target_start"
        TARGET="risck-real-isolated-restore-"+str(os.getpid())
        run(["docker","run","-d","--name",TARGET,"--network","none",
             "--env","POSTGRES_PASSWORD=isolated-disposable-not-production",
             "--env","POSTGRES_DB=postgres",SERVER_IMAGE])
        for _ in range(60):
            r=subprocess.run(["docker","exec",TARGET,"pg_isready","-h","127.0.0.1","-U","supabase_admin","-d","postgres"],env=ENV,capture_output=True)
            if r.returncode==0:break
            time.sleep(1)
        else:raise RuntimeError("TARGET_START_FAILED")
        def target_sql(query,database="recovery_destination"):
            return run(["docker","exec",TARGET,"psql","-X","-qAt","-U","supabase_admin","-d",database,"-v","ON_ERROR_STOP=1","-c",query],text=True)
        target_sql("CREATE DATABASE recovery_destination WITH TEMPLATE template0","postgres")
        for role in sorted(EXPECTED_ROLES):
            target_sql("DO $role$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='"+role+"') THEN CREATE ROLE "+qident(role)+" NOLOGIN; END IF; END $role$;","postgres")
        # Temporary bootstrap ONLY in the network-isolated disposable target.
        restore_creator_roles = EXPECTED_ROLES
        target_sql("GRANT CREATE ON DATABASE recovery_destination TO "+",".join(qident(role) for role in sorted(restore_creator_roles)),"postgres")
        REPORT["isolated_creator_privileges_before_restore"] = creator_privileges(target_sql,restore_creator_roles)
        if REPORT["isolated_creator_privileges_before_restore"] != {"checked":len(restore_creator_roles),"prepared":len(restore_creator_roles)}:
            raise RuntimeError("ISOLATED_CREATOR_GRANTS_NOT_APPLIED")
        align_existing_schema_owners(target_sql,before_catalog)
        REPORT["existing_target_schema_owners_aligned"]=True
        REPORT["target_database_template"]="template0"
        STAGE="isolated_decrypt_restore"
        try:
            STAGE="isolated_restore_pre-data"
            decrypt=age+["age","-d","-i","/work/ephemeral-identity","/work/backup.partial.age"]
            REPORT["schemas_restored_with_original_owners"] = restore_predata_with_owned_schemas(decrypt,TARGET,work,before_catalog)
            for section in ("data","post-data"):
                STAGE="isolated_restore_"+section
                restore=["docker","exec","-i",TARGET,"pg_restore","-U","supabase_admin","-d","recovery_destination","--exit-on-error","--section="+section]
                piped(decrypt,restore,drain_remaining=True)
        except RuntimeError:
            original_diagnostic=REPORT.get("failure_diagnostic")
            try:
                REPORT["isolated_creator_privileges_at_failure"]=creator_privileges(target_sql,restore_creator_roles)
            except RuntimeError:
                REPORT["isolated_privilege_probe_failed"]=True
            if original_diagnostic is not None:REPORT["failure_diagnostic"]=original_diagnostic
            raise
        target_sql("REVOKE CREATE ON DATABASE recovery_destination FROM "+",".join(qident(role) for role in sorted(restore_creator_roles)))
        revoked = json.loads(target_sql("SELECT json_build_object('revoked',NOT has_database_privilege('pg_database_owner',current_database(),'CREATE'))"))["revoked"]
        REPORT["temporary_database_owner_create_revoked"] = revoked
        if not revoked:raise RuntimeError("TEMPORARY_RESTORE_PRIVILEGE_NOT_REVOKED")
        STAGE="verify_real_logical_restore"
        def dst(query):
            return json.loads(target_sql("BEGIN READ ONLY; SET LOCAL timezone='UTC'; SET LOCAL search_path=pg_catalog; "+query+"; COMMIT;"))
        after_rows=fingerprints(dst)
        after_catalog=dst(CATALOG_SQL)
        REPORT["restored_table_count"]=len(after_rows)
        REPORT["row_integrity_matches"]=before_rows==after_rows
        REPORT["catalog_owner_acl_rls_matches"]=before_catalog==after_catalog
        REPORT["catalog_sections_match"]={k:before_catalog[k]==after_catalog.get(k) for k in before_catalog}
        REPORT["catalog_difference_summary"]=catalog_difference_summary(before_catalog,after_catalog)
        REPORT["restored_integrity_sha256"]=hashlib.sha256(canonical(after_rows)).hexdigest()
        REPORT["restored_catalog_sha256"]=hashlib.sha256(canonical(after_catalog)).hexdigest()
        if before_rows!=after_rows or before_catalog!=after_catalog:raise RuntimeError("REAL_RESTORE_INTEGRITY_MISMATCH")
        REPORT["status"]="PASS_LOGICAL_BACKUP_AND_ISOLATED_RESTORE"
    REPORT["private_work_removed"]=not work.exists()

try:
    main()
except Exception:
    REPORT["status"]="FAILED_LOGICAL_RECOVERY"
    REPORT["failure_stage"]=STAGE
finally:
    for process in ACTIVE:
        if process.poll() is None:process.kill()
    if SNAPSHOT_PROCESS is not None and SNAPSHOT_PROCESS.poll() is None:
        SNAPSHOT_PROCESS.kill();SNAPSHOT_PROCESS.communicate()
    removed=True
    if TARGET:
        r=subprocess.run(["docker","rm","-fv",TARGET],env=ENV,capture_output=True,timeout=30)
        removed=r.returncode==0
    REPORT["isolated_container_removed"]=removed
    if not removed:REPORT["status"]="FAILED_LOGICAL_RECOVERY"
    REPORT["exclusions"]=["Managed Auth configuration and provider secrets","Storage object bytes outside Postgres","Global role passwords and login configuration","Any application deployment or production migration"]
    (OUT/"result.json").write_text(json.dumps(REPORT,indent=2)+"\n")
    print(json.dumps(REPORT))
raise SystemExit(0 if REPORT["status"]=="PASS_LOGICAL_BACKUP_AND_ISOLATED_RESTORE" else 1)

