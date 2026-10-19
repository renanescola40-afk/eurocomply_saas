"""Validation-branch-only native connection check. No dump or database writes."""
import base64
import hashlib
import json
import os
import re
import ssl
import subprocess
import tempfile
from pathlib import Path

PROJECT = "tganhbbhfxcpblmgqprg"
IMAGE = "postgres:17.6"
QUERY = """BEGIN READ ONLY;
SELECT json_build_object(
 'server_major', current_setting('server_version_num')::integer / 10000,
 'read_only', current_setting('transaction_read_only') = 'on',
 'ssl', coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false),
 'public_tables', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
 'public_force_rls', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity));
COMMIT;"""


def inputs(env):
    host = env.get("RISCK_SOURCE_DB_HOST", "")
    pooler = re.fullmatch(r"aws-[0-9]+-eu-west-1\.pooler\.supabase\.com", host)
    direct = host == f"db.{PROJECT}.supabase.co"
    if not (pooler or direct):
        raise ValueError("HOST_NOT_ALLOWED_OR_MISSING")
    user = f"postgres.{PROJECT}" if pooler else "postgres"
    password = env.get("RISCK_SOURCE_DB_PASSWORD", "")
    if not password or any(c in password for c in "\x00\r\n"):
        raise ValueError("PASSWORD_MISSING_OR_UNSUPPORTED")
    try:
        ca = base64.b64decode(env.get("RISCK_SOURCE_DB_CA_B64", ""), validate=True).decode("ascii")
        der = ssl.PEM_cert_to_DER_cert(ca)
        if hashlib.sha256(der).hexdigest() != "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa":
            raise ValueError("SOURCE_CA_FINGERPRINT_MISMATCH")
    except Exception:
        raise ValueError("SOURCE_CA_INVALID_OR_MISSING") from None
    return host, user, password, ca


def pg_escape(value):
    return value.replace("\\", "\\\\").replace(":", "\\:")


def check(env, runner=subprocess.run):
    host, user, password, ca = inputs(env)
    # Only this process handles the password; Docker CLI receives a curated env.
    child_env = {k: env[k] for k in ("PATH", "HOME") if k in env}
    with tempfile.TemporaryDirectory(prefix="risck-connection-") as tmp:
        work = Path(tmp)
        work.chmod(0o700)
        passfile = work / "source.pgpass"
        fd = os.open(passfile, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(":".join(map(pg_escape, (host, "5432", "postgres", user, password))) + "\n")
        ca_file = work / "source-ca.pem"
        ca_file.write_text(ca)
        ca_file.chmod(0o400)
        ssl.create_default_context(cafile=str(ca_file))
        (work / "client.passwd").write_text(f"root:x:0:0:root:/tmp:/bin/false\nrecovery:x:{os.getuid()}:{os.getgid()}:recovery:/tmp:/bin/false\n")
        (work / "client.group").write_text(f"root:x:0:\nrecovery:x:{os.getgid()}:\n")
        (work / "client.passwd").chmod(0o444)
        (work / "client.group").chmod(0o444)
        pull = runner(["docker", "pull", IMAGE], env=child_env,
                      capture_output=True, text=True, timeout=180)
        if pull.returncode:
            raise ValueError("PINNED_CLIENT_IMAGE_UNAVAILABLE")
        args = ["docker", "run", "--rm", "--network", "host", "--read-only",
                "--cap-drop=ALL", "--security-opt=no-new-privileges",
                "--user", f"{os.getuid()}:{os.getgid()}",
                "--mount", f"type=bind,src={work},dst=/run/risck,readonly",
                "--mount", f"type=bind,src={work / 'client.passwd'},dst=/etc/passwd,readonly",
                "--mount", f"type=bind,src={work / 'client.group'},dst=/etc/group,readonly",
                "--tmpfs", "/tmp:rw,noexec,nosuid,size=8m"]
        for key, value in {
            "PGHOST": host, "PGPORT": "5432", "PGUSER": user,
            "PGDATABASE": "postgres", "PGPASSFILE": "/run/risck/source.pgpass",
            "PGSSLMODE": "verify-full", "PGSSLROOTCERT": "/run/risck/source-ca.pem",
            "PGCONNECT_TIMEOUT": "10", "PGAPPNAME": "risck-readonly-recovery-preflight",
            "PGOPTIONS": "-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=10000",
        }.items():
            args.extend(["--env", f"{key}={value}"])
        args.extend([IMAGE, "psql", "-X", "-qAt", "--no-password", "-v", "ON_ERROR_STOP=1", "-c", QUERY])
        result = runner(args, env=child_env, capture_output=True, text=True, timeout=40)
        if result.returncode:
            # Never expose raw client diagnostics or connection material.
            diagnostic = result.stderr.lower()
            if "password authentication failed" in diagnostic:
                raise ValueError("AUTHENTICATION_FAILED")
            if "certificate verify failed" in diagnostic or "certificate verification failed" in diagnostic:
                raise ValueError("SERVER_CERTIFICATE_VERIFICATION_FAILED")
            if "timeout" in diagnostic or "network is unreachable" in diagnostic or "could not translate host name" in diagnostic:
                raise ValueError("SOURCE_NETWORK_OR_DNS_UNAVAILABLE")
            raise ValueError("CONNECTION_OR_TLS_OR_QUERY_FAILED")
        value = json.loads(result.stdout.strip())
        if value.get("server_major") != 17 or value.get("read_only") is not True or value.get("ssl") is not True:
            raise ValueError("SERVER_OR_READONLY_OR_TLS_ASSERTION_FAILED")
        tables = value.get("public_tables")
        forced = value.get("public_force_rls")
        if type(tables) is not int or type(forced) is not int or tables < 1 or tables != forced:
            raise ValueError("PUBLIC_FORCE_RLS_ASSERTION_FAILED")
        # Construct a narrow artifact; never save arbitrary query/client output.
        evidence = {"status": "PASS_CONNECTION_PREFLIGHT_ONLY", "server_major": 17,
                    "read_only": True, "tls_verify_full": True,
                    "public_tables": tables, "public_force_rls": forced,
                    "customer_rows_exported": False, "database_writes": False,
                    "production_recovery": "NOT_TESTED"}
    evidence["private_work_removed"] = not work.exists()
    return evidence


if __name__ == "__main__":
    try:
        evidence = check(os.environ)
        Path("artifacts").mkdir(exist_ok=True)
        Path("artifacts/connection-preflight.json").write_text(json.dumps(evidence, indent=2) + "\n")
        print(json.dumps(evidence))
    except Exception as error:
        # Error details may include credentials or source-provided text.
        allowed = {"HOST_NOT_ALLOWED_OR_MISSING", "PASSWORD_MISSING_OR_UNSUPPORTED",
                   "SOURCE_CA_INVALID_OR_MISSING", "PINNED_CLIENT_IMAGE_UNAVAILABLE",
                   "AUTHENTICATION_FAILED", "SERVER_CERTIFICATE_VERIFICATION_FAILED",
                   "SOURCE_NETWORK_OR_DNS_UNAVAILABLE", "CONNECTION_OR_TLS_OR_QUERY_FAILED",
                   "SERVER_OR_READONLY_OR_TLS_ASSERTION_FAILED", "PUBLIC_FORCE_RLS_ASSERTION_FAILED"}
        reason = str(error) if type(error) is ValueError and str(error) in allowed else "INTERNAL_OR_CLIENT_PREREQUISITE_FAILURE"
        print(json.dumps({"status": "READ_ONLY_CONNECTION_PREFLIGHT_FAILED", "reason": reason,
                          "production_recovery": "NOT_TESTED"}))
        raise SystemExit(1)
