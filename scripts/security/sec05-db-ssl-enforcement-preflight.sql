-- SEC-05 Supabase PostgreSQL SSL-enforcement change preflight (read-only).
-- Identifies currently active cleartext TCP clients without exporting addresses
-- or credentials. An observed TLS connection is not proof of SSL enforcement.
BEGIN READ ONLY;
SET LOCAL statement_timeout='10000ms';
SELECT
  (SELECT current_setting('ssl', true)) AS server_ssl_capable,
  count(*) FILTER (WHERE a.backend_type='client backend') AS active_clients,
  count(*) FILTER (WHERE a.backend_type='client backend' AND s.ssl IS TRUE) AS active_tls_clients,
  count(*) FILTER (WHERE a.backend_type='client backend' AND s.ssl IS FALSE AND a.client_addr IS NOT NULL) AS active_non_tls_tcp_clients,
  count(*) FILTER (WHERE a.backend_type='client backend' AND s.ssl IS FALSE
    AND (a.client_addr <<= inet '127.0.0.0/8' OR a.client_addr = inet '::1')
    AND a.application_name='postgres_exporter' AND a.usename='supabase_admin') AS internal_exporter_loopback_clients,
  count(*) FILTER (WHERE a.backend_type='client backend' AND s.ssl IS FALSE
    AND a.client_addr IS NOT NULL
    AND NOT (a.client_addr <<= inet '127.0.0.0/8' OR a.client_addr = inet '::1')) AS other_non_tls_tcp_clients
FROM pg_stat_activity a
LEFT JOIN pg_stat_ssl s ON s.pid=a.pid;
ROLLBACK;
