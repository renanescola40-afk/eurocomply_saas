"""Validation-branch-only native connection check. No dump or database writes."""
import base64
import hashlib
import json
import os
import re
import ssl
import socket
import struct
import threading
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



def synthetic_passfile_probe(common_args, env, work, runner):
    """Local fake protocol endpoint; only a fixed synthetic password is used."""
    synthetic = r"synthetic:pass\\word@2026!"
    observed, failures = [], []
    with socket.socket() as server:
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        server.settimeout(15)
        port = server.getsockname()[1]
        probe_file = work / "synthetic.pgpass"
        fd = os.open(probe_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(":".join(map(pg_escape, ("127.0.0.1", str(port), "synthetic", "synthetic", synthetic))) + "\n")

        def receive_exact(conn, size):
            data = b""
            while len(data) < size:
                chunk = conn.recv(size - len(data))
                if not chunk:
                    raise ValueError("SYNTHETIC_PROTOCOL_FAILED")
                data += chunk
            return data

        def serve():
            try:
                conn, _ = server.accept()
                with conn:
                    conn.settimeout(10)
                    size = struct.unpack("!I", receive_exact(conn, 4))[0]
                    if not 8 <= size <= 10000:
                        raise ValueError("SYNTHETIC_PROTOCOL_FAILED")
                    receive_exact(conn, size - 4)
                    conn.sendall(b"R" + struct.pack("!II", 8, 3))
                    kind = receive_exact(conn, 1)
                    size = struct.unpack("!I", receive_exact(conn, 4))[0]
                    if kind != b"p" or not 5 <= size <= 1000:
                        raise ValueError("SYNTHETIC_PROTOCOL_FAILED")
                    observed.append(receive_exact(conn, size - 4) == synthetic.encode() + b"\0")
                    fields = b"SFATAL\0C28000\0Msynthetic probe complete\0\0"
                    conn.sendall(b"E" + struct.pack("!I", len(fields) + 4) + fields)
            except Exception:
                failures.append(True)

        worker = threading.Thread(target=serve, daemon=True)
        worker.start()
        args = list(common_args)
        for key, value in {
            "PGHOST": "127.0.0.1", "PGPORT": str(port),
            "PGUSER": "synthetic", "PGDATABASE": "synthetic",
            "PGPASSFILE": "/run/risck/synthetic.pgpass", "PGSSLMODE": "disable",
            "PGGSSENCMODE": "disable", "PGCONNECT_TIMEOUT": "5",
        }.items():
            args.extend(["--env", f"{key}={value}"])
        args.extend([IMAGE, "psql", "-X", "--no-password", "-c", "SELECT 1"])
        try:
            runner(args, env=env, capture_output=True, text=True, timeout=20)
        finally:
            worker.join(timeout=16)
        if worker.is_alive() or failures or observed != [True]:
            raise ValueError("SYNTHETIC_PASSFILE_CLIENT_FAILED")
        probe_file.unlink()
    return True


def check(env, runner=subprocess.run, port=5432, probe=True):
    if port not in (5432, 6543):
        raise ValueError("PORT_NOT_ALLOWED")
    host, user, password, ca = inputs(env)
    # Only this process handles the password; Docker CLI receives a curated env.
    child_env = {k: env[k] for k in ("PATH", "HOME") if k in env}
    with tempfile.TemporaryDirectory(prefix="risck-connection-") as tmp:
        work = Path(tmp)
        work.chmod(0o700)
        passfile = work / "source.pgpass"
        fd = os.open(passfile, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(":".join(map(pg_escape, (host, str(port), "postgres", user, password))) + "\n")
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
        if probe:
            synthetic_passfile_probe(args, child_env, work, runner)
        for key, value in {
            "PGHOST": host, "PGPORT": str(port), "PGUSER": user,
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
        if value.get("server_major") != 17:
            raise ValueError("SERVER_MAJOR_ASSERTION_FAILED")
        if value.get("read_only") is not True:
            raise ValueError("READONLY_ASSERTION_FAILED")
        if type(value.get("ssl")) is not bool:
            raise ValueError("BACKEND_TLS_SIGNAL_INVALID")
        # pg_stat_ssl observes the pooler-to-database hop, not client-to-pooler.
        # The native client still MUST use verify-full with the pinned root CA.
        if host == f"db.{PROJECT}.supabase.co" and value["ssl"] is not True:
            raise ValueError("DIRECT_BACKEND_TLS_ASSERTION_FAILED")
        tables = value.get("public_tables")
        forced = value.get("public_force_rls")
        if type(tables) is not int or type(forced) is not int or tables < 1 or tables != forced:
            raise ValueError("PUBLIC_FORCE_RLS_ASSERTION_FAILED")
        # Construct a narrow artifact; never save arbitrary query/client output.
        evidence = {"status": "PASS_CONNECTION_PREFLIGHT_ONLY", "server_major": 17,
                    "port": port, "backend_tls_observed": value["ssl"],
                    "tls_scope": "client_to_pooler" if ".pooler." in host else "client_to_database",
                    "read_only": True, "tls_verify_full": True,
                    "public_tables": tables, "public_force_rls": forced,
                    "customer_rows_exported": False, "database_writes": False,
                    "production_recovery": "NOT_TESTED"}
    evidence["private_work_removed"] = not work.exists()
    return evidence



ALLOWED = {"HOST_NOT_ALLOWED_OR_MISSING", "PASSWORD_MISSING_OR_UNSUPPORTED",
           "SOURCE_CA_INVALID_OR_MISSING", "PINNED_CLIENT_IMAGE_UNAVAILABLE",
           "AUTHENTICATION_FAILED", "SERVER_CERTIFICATE_VERIFICATION_FAILED",
           "SOURCE_NETWORK_OR_DNS_UNAVAILABLE", "CONNECTION_OR_TLS_OR_QUERY_FAILED",
           "SERVER_OR_READONLY_OR_TLS_ASSERTION_FAILED", "PUBLIC_FORCE_RLS_ASSERTION_FAILED",
           "SYNTHETIC_PASSFILE_CLIENT_FAILED", "PORT_NOT_ALLOWED",
           "SERVER_MAJOR_ASSERTION_FAILED", "READONLY_ASSERTION_FAILED",
           "BACKEND_TLS_SIGNAL_INVALID", "DIRECT_BACKEND_TLS_ASSERTION_FAILED"}


def diagnose(env, checker=check):
    results = []
    for port in (5432, 6543):
        try:
            evidence = checker(env, port=port, probe=(port == 5432))
            results.append({"port": port, "status": evidence["status"],
                            "read_only": evidence["read_only"],
                            "client_tls_verify_full": evidence["tls_verify_full"],
                            "backend_tls_observed": evidence["backend_tls_observed"],
                            "tls_scope": evidence["tls_scope"]})
        except Exception as error:
            reason = str(error) if type(error) is ValueError and str(error) in ALLOWED else "INTERNAL_OR_CLIENT_PREREQUISITE_FAILURE"
            results.append({"port": port, "status": "FAILED", "reason": reason})
            if reason != "AUTHENTICATION_FAILED":
                break
    probe_passed = bool(results) and (results[0]["status"] == "PASS_CONNECTION_PREFLIGHT_ONLY" or results[0].get("reason") in {"AUTHENTICATION_FAILED", "SERVER_MAJOR_ASSERTION_FAILED", "READONLY_ASSERTION_FAILED", "BACKEND_TLS_SIGNAL_INVALID", "DIRECT_BACKEND_TLS_ASSERTION_FAILED", "PUBLIC_FORCE_RLS_ASSERTION_FAILED"})
    passed = any(r["status"] == "PASS_CONNECTION_PREFLIGHT_ONLY" for r in results)
    return {"status": "PASS_CONNECTION_DIAGNOSTIC_ONLY" if passed else "CONNECTION_DIAGNOSTIC_FAILED",
            "attempts": results, "synthetic_passfile_probe": "PASS" if probe_passed else "NOT_PROVEN",
            "customer_rows_exported": False, "database_writes": False,
            "production_recovery": "NOT_TESTED"}


if __name__ == "__main__":
    evidence = diagnose(os.environ)
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/connection-preflight.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence))
    raise SystemExit(0 if evidence["status"] == "PASS_CONNECTION_DIAGNOSTIC_ONLY" else 1)
