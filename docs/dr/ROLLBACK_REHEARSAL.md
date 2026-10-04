# Live Rollback Exercise — 2026-10-04

## Exercise objective

Prove that RISCK COMPLY can execute a real Vercel rollback to a previously READY production deployment and then safely return production to the intended current deployment.

## Pre-exercise production subject

- production hostname: `www.risckcomply.com`
- current deployment: `dpl_DEJ4TPCEPeC7xoyDWdzaJ2wd1TnW`
- current Git SHA: `bd435ac11b46cab2f0f84a215d74cc63784a6b65`
- state: `READY`
- target: `production`
- rollback candidate: `true`

Selected rollback target:
- deployment: `dpl_AkWMF5d9XuBye6Vp8bXNLMoKCEUE`
- Git SHA: `8489f7001cd4e98c8d93deb24593fc4cd6937719`
- state: `READY`
- target: `production`
- rollback candidate: `true`

The selected target was intentionally low risk: it immediately preceded the DR documentation reconciliation and did not represent an unrelated emergency downgrade.

## Execution

A controlled Vercel provider rollback request was executed from the current deployment to the selected previous READY deployment.

The Vercel deployment lookup for the rollback target subsequently showed production aliases including:
- `www.risckcomply.com`
- `risckcomply.com`
- `eurocomply-saas.vercel.app`

This proves the rollback request was applied to production routing rather than being only a dry-run.

The current intended deployment was then explicitly promoted back to production.

Final hostname resolution was revalidated through the Vercel API:
- `www.risckcomply.com` -> `dpl_DEJ4TPCEPeC7xoyDWdzaJ2wd1TnW`
- Git SHA -> `bd435ac11b46cab2f0f84a215d74cc63784a6b65`
- final state -> `READY`
- final target -> `production`

## Final production health

After returning to the intended current deployment:

- `GET https://www.risckcomply.com/api/health` -> HTTP **200**
- response -> `{"status":"ok"}`
- `Cache-Control` -> `no-store, no-cache, must-revalidate, proxy-revalidate, private`
- observed response date -> `2026-10-04T08:54:53Z`

## Classification

- CURRENT_PRODUCTION_SUBJECT_IDENTIFIED=PROVEN
- KNOWN_GOOD_DEPLOYMENT_IDENTIFIED=PROVEN
- LIVE_VERCEL_ROLLBACK_EXECUTED=PROVEN
- PRODUCTION_ALIAS_SWITCH=PROVEN
- FORWARD_RESTORE_TO_INTENDED_DEPLOYMENT=PROVEN
- FINAL_PRODUCTION_HOSTNAME_BINDING=PROVEN
- FINAL_HEALTHCHECK=PASS
- FINAL_NO_STORE_HEADER=PASS
- ROLLBACK_EXECUTION=PASS
- PRODUCTION_RETURN_TO_INTENDED_VERSION=PASS

## Safety

- Supabase Production mutation: NO
- Stripe mutation: NO
- Auth configuration mutation: NO
- DNS configuration mutation: NO
- Vercel production routing temporarily changed: YES — controlled DR exercise
- Final production deployment restored: YES
- Email sent: NO
