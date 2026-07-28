# Restore Drill Runbook

## Preconditions

- current `main` SHA recorded;
- approved maintenance window;
- protected production environment approver available;
- provider backup exists and is accessible;
- isolated target can be created without public exposure;
- synthetic tenant fixtures are prepared;
- cleanup owner is assigned.

## Execution

1. Record the backup creation time and hash its provider identifier locally.
2. Create a new isolated restore target with no production traffic, webhooks, scheduled jobs or outbound email.
3. Restore the selected backup.
4. Measure restore completion time and calculate RTO.
5. Compare the backup point with the drill start and calculate RPO.
6. Verify required schemas, tables, columns, indexes, constraints, functions, triggers and migration history.
7. Verify RLS and FORCE RLS for tenant-sensitive tables.
8. Run cross-tenant read and mutation denial tests with synthetic organizations.
9. Verify auth, session, role and protected-route boundaries.
10. Compare bounded aggregate counts for critical entities. Do not export raw customer data.
11. Run health, readiness and application smoke checks against the isolated target.
12. Disable and remove the isolated target, or quarantine it under the approved retention policy.
13. Produce the sanitized evidence JSON.
14. Obtain independent approval.
15. Upload the source artifact and run the promotion workflow.

## Immediate stop conditions

Stop and escalate when:

- the target receives production traffic;
- webhooks, email or scheduled jobs are enabled unexpectedly;
- cross-tenant access succeeds;
- RLS is absent or not forced where required;
- migration history differs materially from the expected state;
- restore requires destructive changes to production;
- credentials or raw customer data enter an artifact;
- cleanup cannot be completed.

## Incident handling

Treat cross-tenant access, exposed credentials, unexpected outbound calls or production mutation as a security incident. Preserve logs, revoke affected credentials, isolate the target and follow the security incident runbook.

## Evidence retention

Retain only the promoted sanitized artifact and the provider-side approved drill record. The promoted artifact is retained for 365 days. Raw database exports are prohibited.
