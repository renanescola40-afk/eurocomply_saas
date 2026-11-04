-- SEC-05 reproducible TRANSPORT-ONLY evidence; QA and PROD READ-ONLY.
-- Run through an authorized Supabase SQL connection; do not write or reveal secrets.
-- pg_stat_ssl proves the CURRENT SQL connection negotiated TLS; it does NOT
-- establish server-wide rejection of clients that attempt non-TLS Postgres.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10000ms';
SELECT
  ssl AS connection_encrypted,
  version AS tls_version,
  cipher AS tls_cipher,
  (ssl AND version IN ('TLSv1.2', 'TLSv1.3')) AS observed_connection_tls_ok
FROM pg_stat_ssl
WHERE pid = pg_backend_pid();
ROLLBACK;
