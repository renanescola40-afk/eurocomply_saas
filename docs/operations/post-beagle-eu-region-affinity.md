# Post-Beagle EU function region affinity

Status: `WAITING_FOR_BEAGLE_COMPLETION`

This change is intentionally held while the active Beagle assessment is running against the current Production deployment.

## Evidence observed before preparation

- Supabase Production project region: `eu-west-1`.
- Current frozen Vercel Production deployment region: `iad1`.
- Repeated authenticated `/api/ready` checks on the frozen deployment returned `503` with a bounded Supabase readiness timeout.
- Database activity remained healthy during the observation window and the readiness tables are small, so this change is treated as regional-affinity hardening rather than proof of root-cause closure.

## Proposed post-freeze change

Set the Vercel project function region to `dub1` through repository-controlled `vercel.json`, keeping automatic Git deployments disabled.

## Acceptance after explicit Production unfreeze

1. Merge only after the Beagle report is available, findings are triaged, and owner unfreeze is explicit.
2. Deploy through the governed exact-SHA Production workflow.
3. Verify the canonical deployment reports the intended EU function region.
4. Re-run authenticated `/api/ready` repeatedly and retain latency/status evidence.
5. Do not claim the historic 503 is resolved solely from this configuration change; require runtime proof.
