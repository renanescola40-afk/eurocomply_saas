#!/usr/bin/env python3
"""Disposable synthetic recovery only; never accepts a production connection."""
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

BASE_SHA = '051c7130b735bc50f5b36a6330e84058726c2d99'
SCRIPT_BLOB = 'dc33f4e442e6fcfca20efe4e34a575a7d2597acd'
ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / 'artifacts/recovery/result.json'
START = time.time()
REPORT = {'schema': 'risck.synthetic-recovery.v1', 'status': 'RUNNING',
          'baseMainSha': BASE_SHA, 'testedScriptBlob': SCRIPT_BLOB,
          'validationCommitSha': os.getenv('CIRCLE_SHA1'),
          'circleBuildUrl': os.getenv('CIRCLE_BUILD_URL'),
          'productionRecovery': 'NOT_TESTED', 'productionWrites': False,
          'mainChanged': False, 'checks': [],
          'limits': ['Synthetic logical database only; not a full Supabase recovery.',
                     'No real customer data, source credential or managed Auth/Storage recovery.',
                     'Restored ACLs/ownership are excluded by the prototype; reader grant is a test-only setup.',
                     'This result cannot authorize production migration or promotion by itself.']}
DOCKER = shutil.which('docker')
WORK = None
CONTAINERS = []
TOOLS = 'risck-recovery-tools:synthetic'


def run(args, *, env=None, data=None, ok=True, timeout=120):
    result = subprocess.run(args, input=data, text=True, capture_output=True,
                            env=env, timeout=timeout)
    if ok and result.returncode:
        # No commands, environment values or private key material in diagnostics.
        diagnostic = ''
        if Path(args[0]).name == 'psql':
            diagnostic = re.sub(r'postgres(?:ql)?://\S+', '[REDACTED_URI]', result.stderr)
            diagnostic = diagnostic.replace('synthetic-local-only', '[REDACTED]')[:700]
        raise RuntimeError('Command failed: ' + Path(args[0]).name +
                           ', exit=' + str(result.returncode) + ': ' + diagnostic)
    return result


def check(name, condition, **facts):
    if not condition:
        raise RuntimeError('Check failed: ' + name)
    REPORT['checks'].append({'name': name, 'status': 'PASS', **facts})
    print('PASS: ' + name, flush=True)


def sql(container, query, *, ok=True):
    return run([DOCKER, 'exec', '-i', container, 'psql', '-X',
                '-v', 'ON_ERROR_STOP=1', '-U', 'fixture', '-d', 'fixture',
                '-At', '-c', query], ok=ok)


def ready(container):
    for _ in range(45):
        if run([DOCKER, 'exec', container, 'pg_isready', '-U', 'fixture',
                '-d', 'fixture'], ok=False).returncode == 0:
            return
        time.sleep(1)
    raise RuntimeError('Synthetic database did not become ready')


def tool(args, *, data=None, ok=True):
    return run([DOCKER, 'run', '--rm', '-i', '--network', 'none',
                '--user', str(os.getuid()) + ':' + str(os.getgid()),
                '-v', '/etc/passwd:/etc/passwd:ro', '-v', '/etc/group:/etc/group:ro',
                '-v', str(WORK) + ':' + str(WORK), TOOLS, *args],
               data=data, ok=ok)


def rejects_decryption(identity, ciphertext):
    result = subprocess.run([DOCKER, 'run', '--rm', '-i', '--network', 'none',
        '--user', str(os.getuid()) + ':' + str(os.getgid()),
        '-v', '/etc/passwd:/etc/passwd:ro', '-v', '/etc/group:/etc/group:ro',
        '-v', str(WORK) + ':' + str(WORK), TOOLS, 'age', '-d',
        '-i', str(identity), str(ciphertext)], stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL, timeout=30)
    return result.returncode != 0


def fingerprints(container):
    return {table: sql(container, "SELECT count(*)::text || ':' || md5(coalesce("
            "string_agg(to_jsonb(t)::text, E'\\n' ORDER BY to_jsonb(t)::text),'')) "
            "FROM public." + table + ' t').stdout.strip()
            for table in ['organizations', 'members', 'documents', 'audit_entries']}


def main():
    global WORK
    forbidden = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN',
                 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'VERCEL_TOKEN',
                 'DATABASE_URL', 'DIRECT_URL', 'RESEND_API_KEY', 'SENTRY_AUTH_TOKEN',
                 'RISCK_SOURCE_DATABASE_URL', 'RISCK_BACKUP_DATABASE_URL',
                 'RISCK_AGE_IDENTITY_FILE', 'RISCK_RESTORE_PASSWORD', 'PGSERVICE']
    check('production credentials absent', not any(os.getenv(k) for k in forbidden))
    check('Docker executor present', DOCKER is not None)
    source = ROOT / 'scripts/recovery/isolated-logical-restore.sh'
    content = source.read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()
    check('exact frozen main script blob', blob == SCRIPT_BLOB)
    WORK = Path(tempfile.mkdtemp(prefix='risck-synthetic-recovery-'))
    WORK.chmod(0o700)
    run([DOCKER, 'pull', 'postgres:17.6'], timeout=240)
    (WORK / 'Dockerfile').write_text('FROM postgres:17.6\nRUN apt-get update && apt-get install -y --no-install-recommends age openssl && rm -rf /var/lib/apt/lists/*\n')
    run([DOCKER, 'build', '--pull', '-t', TOOLS, str(WORK)], timeout=360)
    run([DOCKER, 'tag', 'postgres:17.6', 'postgres:17'])
    REPORT['postgresImageId'] = run([DOCKER, 'image', 'inspect', 'postgres:17.6',
                                    '--format', '{{.Id}}']).stdout.strip()
    REPORT['toolsImageId'] = run([DOCKER, 'image', 'inspect', TOOLS,
                                 '--format', '{{.Id}}']).stdout.strip()
    for command in ['pg_dump', 'pg_restore', 'psql']:
        version = tool([command, '--version']).stdout.strip()
        check(command + ' version 17.6', '17.6' in version, version=version)
    REPORT['ageVersion'] = tool(['age', '--version']).stdout.strip()
    tls = WORK / 'tls'
    tls.mkdir()
    run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
         '-keyout', str(tls / 'server.key'), '-out', str(tls / 'server.crt'),
         '-days', '1', '-subj', '/CN=127.0.0.1',
         '-addext', 'subjectAltName=IP:127.0.0.1'])
    run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
         '-keyout', str(WORK / 'wrong-ca.key'), '-out', str(WORK / 'wrong-ca.crt'),
         '-days', '1', '-subj', '/CN=synthetic-wrong-ca'])
    postgres_uid = run([DOCKER, 'run', '--rm', '--network', 'none',
                        'postgres:17.6', 'id', '-u', 'postgres']).stdout.strip()
    run(['sudo', 'chown', postgres_uid + ':' + postgres_uid, str(tls / 'server.key')])
    run(['sudo', 'chmod', '600', str(tls / 'server.key')])
    # The certificate directory must be traversable inside the bind mount.
    tls.chmod(0o755)
    src = 'risck-synthetic-source-' + str(os.getpid())
    CONTAINERS.append(src)
    run([DOCKER, 'run', '-d', '--name', src, '-p', '127.0.0.1:55432:5432',
         '-v', str(tls) + ':/tls:ro', '-e', 'POSTGRES_DB=fixture',
         '-e', 'POSTGRES_USER=fixture', '-e', 'POSTGRES_PASSWORD=synthetic-local-only',
         'postgres:17.6', '-c', 'ssl=on', '-c', 'ssl_cert_file=/tls/server.crt',
         '-c', 'ssl_key_file=/tls/server.key'])
    ready(src)
    sql(src, """
CREATE EXTENSION pgcrypto;
CREATE TABLE organizations(id text PRIMARY KEY, label text NOT NULL);
CREATE TABLE members(org text REFERENCES organizations(id), id integer, state text CHECK(state IN ('active','suspended')), PRIMARY KEY(org,id));
CREATE TABLE documents(id bigserial PRIMARY KEY, org text, member_id integer, body text NOT NULL, FOREIGN KEY(org,member_id) REFERENCES members(org,id));
CREATE TABLE audit_entries(id bigserial PRIMARY KEY, org text, member_id integer, digest text NOT NULL, FOREIGN KEY(org,member_id) REFERENCES members(org,id));
INSERT INTO organizations VALUES('tenant-a','Synthetic A'),('tenant-b','Synthetic B');
INSERT INTO members VALUES('tenant-a',1,'active'),('tenant-a',2,'suspended'),('tenant-b',3,'active');
INSERT INTO documents(org,member_id,body) VALUES('tenant-a',1,'fixture alpha'),('tenant-a',2,'fixture beta'),('tenant-b',3,'fixture gamma');
INSERT INTO audit_entries(org,member_id,digest) SELECT org,id,encode(digest(org||':'||id::text,'sha256'),'hex') FROM members;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY; ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY; ALTER TABLE members FORCE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY; ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE audit_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON organizations FOR SELECT USING(id=current_setting('risck.test_tenant',true));
CREATE POLICY tenant_scope ON members FOR SELECT USING(org=current_setting('risck.test_tenant',true));
CREATE POLICY tenant_scope ON documents FOR SELECT USING(org=current_setting('risck.test_tenant',true));
CREATE POLICY tenant_scope ON audit_entries FOR SELECT USING(org=current_setting('risck.test_tenant',true));
CREATE VIEW active_members AS SELECT org,id FROM members WHERE state='active';
""")
    before = fingerprints(src)
    REPORT['sourceFingerprints'] = before
    wrappers = WORK / 'bin'
    wrappers.mkdir()
    for name in ['pg_dump', 'pg_restore', 'psql', 'age']:
        network = 'none' if name == 'age' else 'host'
        env_options = '' if name == 'age' else '-e PGDATABASE -e PGSSLMODE -e PGSSLROOTCERT'
        wrapper = wrappers / name
        wrapper.write_text('#!/usr/bin/env bash\nset -euo pipefail\nexec "' + DOCKER +
                           '" run --rm -i --network ' + network + ' --user "$(id -u):$(id -g)" ' +
                           env_options + ' -v /etc/passwd:/etc/passwd:ro -v /etc/group:/etc/group:ro -v "' + str(WORK) + ':' + str(WORK) + '" ' +
                           TOOLS + ' ' + name + ' "$@"\n')
        wrapper.chmod(0o700)
    identity = WORK / 'identity.age'
    tool(['age-keygen', '-o', str(identity)])
    recipient = tool(['age-keygen', '-y', str(identity)]).stdout.strip()
    env = os.environ.copy()
    env.update({'PATH': str(wrappers) + ':' + env['PATH'],
                'RISCK_SOURCE_DATABASE_URL': 'postgresql://fixture:synthetic-local-only@127.0.0.1:55432/fixture',
                'PGSSLMODE': 'verify-full', 'PGSSLROOTCERT': str(tls / 'server.crt'),
                'RISCK_AGE_RECIPIENT': recipient, 'RISCK_AGE_IDENTITY_FILE': str(identity),
                'RISCK_RESTORE_PASSWORD': 'synthetic-restore-only',
                'RISCK_RECOVERY_OUTPUT_DIR': str(WORK / 'output'), 'TMPDIR': str(WORK)})
    tls_env = env.copy()
    tls_env['PGDATABASE'] = env['RISCK_SOURCE_DATABASE_URL']
    check('verified TLS connection', run([str(wrappers / 'psql'), '-XAt', '-c',
          'select ssl from pg_stat_ssl where pid=pg_backend_pid()'], env=tls_env).stdout.strip() == 't')
    bad_env = tls_env.copy()
    bad_env['PGSSLROOTCERT'] = str(WORK / 'wrong-ca.crt')
    check('untrusted CA rejected', run([str(wrappers / 'psql'), '-XAt', '-c', 'select 1'],
                                      env=bad_env, ok=False).returncode != 0)
    process = subprocess.Popen(['bash', str(source)], env=env,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    CONTAINERS.append('risck-restore-' + str(process.pid))
    try:
        process.communicate(timeout=180)
    except subprocess.TimeoutExpired:
        process.kill()
        process.communicate()
        raise RuntimeError('Recovery prototype exceeded bounded timeout')
    check('recovery prototype exit zero', process.returncode == 0)
    evidence = (WORK / 'output/restore-evidence.txt').read_text()
    check('unchanged main recovery script completed', 'RESTORE_PASS=true' in evidence)
    dump = WORK / 'output/backup.dump.age'
    raw = dump.read_bytes()
    check('ciphertext age header', raw.startswith(b'age-encryption.org/v1\n'))
    digest = hashlib.sha256(raw).hexdigest()
    check('ciphertext checksum matches', digest == (WORK / 'output/backup.dump.age.sha256').read_text().split()[0])
    REPORT['ciphertextSha256'] = digest
    REPORT['ciphertextBytes'] = len(raw)
    check('no persistent plaintext dump', sorted(p.name for p in (WORK / 'output').iterdir()) ==
          ['backup.dump.age', 'backup.dump.age.sha256', 'restore-evidence.txt'])
    wrong_identity = WORK / 'wrong-identity.age'
    tool(['age-keygen', '-o', str(wrong_identity)])
    check('wrong age identity rejected', rejects_decryption(wrong_identity, dump))
    tampered = WORK / 'tampered.age'
    tampered.write_bytes(raw[:-1] + bytes([raw[-1] ^ 1]))
    check('ciphertext tampering rejected', rejects_decryption(identity, tampered))
    target = 'risck-synthetic-verify-' + str(os.getpid())
    CONTAINERS.append(target)
    run([DOCKER, 'run', '-d', '--name', target, '--network', 'none',
         '-e', 'POSTGRES_DB=fixture', '-e', 'POSTGRES_USER=fixture',
         '-e', 'POSTGRES_PASSWORD=synthetic-verify-only', 'postgres:17.6'])
    ready(target)
    # Stream ciphertext decryption directly into another native restore; no plaintext file.
    decrypt = subprocess.Popen([DOCKER, 'run', '--rm', '-i', '--network', 'none',
        '--user', str(os.getuid()) + ':' + str(os.getgid()), '-v', str(WORK)+':'+str(WORK),
        '-v', '/etc/passwd:/etc/passwd:ro', '-v', '/etc/group:/etc/group:ro',
        TOOLS, 'age', '-d', '-i', str(identity), str(dump)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    restore = subprocess.run([DOCKER, 'exec', '-i', target, 'pg_restore', '-U', 'fixture',
        '-d', 'fixture', '--no-owner', '--no-acl', '--exit-on-error'], stdin=decrypt.stdout,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    decrypt.stdout.close()
    check('independent native restore stream', restore.returncode == 0 and decrypt.wait(timeout=30) == 0)
    version = sql(target, 'show server_version').stdout.strip()
    check('restored server version 17.6', version.startswith('17.6'), version=version)
    after = fingerprints(target)
    REPORT['restoredFingerprints'] = after
    for table in before:
        check('rows and content preserved: ' + table, before[table] == after[table], fingerprint=after[table])
    check('forced RLS restored', sql(target, "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity").stdout.strip() == '4')
    check('policies restored', sql(target, "select count(*) from pg_policies where schemaname='public'").stdout.strip() == '4')
    check('view restored', sql(target, 'select count(*) from active_members').stdout.strip() == '2')
    check('audit digests preserved', sql(target, "select bool_and(digest=encode(digest(org||':'||member_id::text,'sha256'),'hex')) from audit_entries").stdout.strip() == 't')
    violation = sql(target, "BEGIN; INSERT INTO documents(org,member_id,body) VALUES('tenant-a',3,'synthetic invalid tenant'); ROLLBACK;", ok=False)
    check('cross-tenant foreign key enforced', violation.returncode != 0 and 'foreign key constraint' in violation.stderr)
    sql(target, 'CREATE ROLE risck_recovery_reader; GRANT USAGE ON SCHEMA public TO risck_recovery_reader; GRANT SELECT ON ALL TABLES IN SCHEMA public TO risck_recovery_reader;')
    for tenant, expected in [('tenant-a','2'), ('tenant-b','1'), ('','0')]:
        result = sql(target, "SET ROLE risck_recovery_reader; SET risck.test_tenant='"+tenant+"'; SELECT count(*) FROM documents;").stdout.strip().splitlines()[-1]
        check('restored RLS tenant ' + (tenant or 'unset'), result == expected, visibleRows=int(result))
    check('restored sequence advances', sql(target, "BEGIN; SELECT nextval('documents_id_seq') > (SELECT max(id) FROM documents); ROLLBACK;").stdout.strip().splitlines()[-2] == 't')
    REPORT['status'] = 'PASS_SYNTHETIC_ONLY'


try:
    main()
except Exception as error:
    REPORT['status'] = 'FAIL'
    REPORT['failure'] = str(error)[:400]
    print('FAIL: ' + REPORT['failure'], flush=True)
finally:
    cleanup_ok = True
    for container in CONTAINERS:
        exists = run([DOCKER, 'container', 'inspect', container], ok=False).returncode == 0
        if exists:
            result = run([DOCKER, 'rm', '-f', container], ok=False)
            cleanup_ok = cleanup_ok and result.returncode == 0
    if WORK is not None:
        result = run(['sudo', 'rm', '-rf', str(WORK)], ok=False)
        cleanup_ok = cleanup_ok and result.returncode == 0
    REPORT['cleanup'] = 'PASS' if cleanup_ok else 'FAIL'
    if not cleanup_ok:
        REPORT['status'] = 'FAIL'
    REPORT['passedChecks'] = len(REPORT['checks'])
    REPORT['elapsedSeconds'] = round(time.time() - START, 3)
    REPORT['observedAtEpoch'] = int(time.time())
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_text(json.dumps(REPORT, indent=2) + '\n')
    print(json.dumps({'status': REPORT['status'], 'passedChecks': REPORT['passedChecks'],
                      'cleanup': REPORT['cleanup'], 'productionRecovery': 'NOT_TESTED'}), flush=True)
if REPORT['status'] != 'PASS_SYNTHETIC_ONLY':
    raise SystemExit(1)
