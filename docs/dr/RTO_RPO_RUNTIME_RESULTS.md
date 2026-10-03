# RTO / RPO Runtime Results — 2026-10-03

## Declared targets

Current continuity documentation defines:
- initial core-application RTO target: **4 hours**
- initial database RPO target: **24 hours**, subject to provider backup configuration
- enterprise roadmap: RTO 1 hour / RPO 4 hours or better

## Runtime timing captured

Dedicated disposable DR branch creation began:

`2026-10-03T18:16:11Z`

Full canonical replay and final branch state `FUNCTIONS_DEPLOYED` were observed at approximately:

`2026-10-03T20:25Z`

Observed end-to-end **schema/control-plane replay exercise elapsed time: ~2h09m**.

This duration includes diagnosis of real clean-replay failures plus branch-only compatibility reconstruction. It is therefore a conservative observed exercise duration rather than an ideal automated restore benchmark.

## RTO classification

The database/schema control plane was reconstructed to:
- 113/113 canonical migrations
- 107/107 public-table parity
- 107/107 RLS-enable parity

within the documented initial 4-hour target.

Therefore:

`SCHEMA_RECOVERY_RTO_PROOF=PROVEN_WITHIN_4H_TARGET`

However, full application recovery was not executed against the recovered branch, and customer data was not restored.

Therefore:

`FULL_APPLICATION_RTO=NOT_PROVEN`

The 2h09m measurement must not be presented as full service RTO.

## RPO classification

The branch was created with `with_data=false`. No backup snapshot/PITR recovery point was selected and no production customer data was restored.

Therefore:
- DATA_RECOVERY_POINT=NOT_MEASURED
- DATABASE_DATA_RPO=NOT_PROVEN
- STORAGE_OBJECT_RPO=NOT_PROVEN

## Final verdict

- SCHEMA_REPLAY_ELAPSED≈2h09m
- SCHEMA_RTO_4H_TARGET=PASS
- FULL_APPLICATION_RTO=OPEN
- DATABASE_DATA_RPO=OPEN
- STORAGE_RPO=OPEN
