# RISCK COMPLY — Beagle assessment operational notice

Date: 2026-09-12  
Last reconciled: 2026-09-24  
Status: `ASSESSMENT_COMPLETED / REPORT_RECEIVED / REMEDIATION_EVIDENCE_AVAILABLE / CLEAN_RETEST_OPEN`

This file originally captured the Beagle scan while it was still running. That active-scan baseline has been superseded by later attributable evidence retained in:

- `docs/security/evidence/external/beagle-vapt-2026-09-12.md`
- `docs/evidence/pentest-closure.md`
- `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-12.md`
- `docs/enterprise/ENTERPRISE_CLOSURE_CONTROLLER_V2_2026-09-14.md`

## Current truth

```text
BEAGLE_TEST_COMPLETED=true
BEAGLE_REPORT_AVAILABLE=true
REPORT_RECEIVED=true
PROVIDER_COMPLETION_DATE=2026-09-12
FINDINGS_TRIAGED=true
EVIDENCE_PRESERVED=true
ORIGINAL_CRITICAL=0
ORIGINAL_HIGH=2
ORIGINAL_HIGH_ROOT_CAUSE=TLS_1_0_TLS_1_1_EDGE_ACCEPTANCE
TECHNICAL_REMEDIATION_EVIDENCE=AVAILABLE
CLEAN_INDEPENDENT_RETEST=OPEN
AUTOMATED_EXTERNAL_VAPT=NOT_PASS
INDEPENDENT_HUMAN_PENTEST=NOT_PASS
```

Public-safe private-artifact provenance is represented only by the approved digest already recorded in the canonical evidence files. The report body, reproduction details, screenshots and provider-confidential material remain outside the public repository.

## Security-assurance boundary

The completed Beagle work is attributable third-party black-box/automated external web-application assessment evidence. It must not be represented as:

- a clean penetration-test pass;
- authenticated tenant-isolation proof;
- a human/manual penetration test;
- SOC 2 or ISO 27001 assurance;
- exact-current-main security validation; or
- terminal independent assurance.

The original two High findings related to TLS 1.0/TLS 1.1 acceptance at the public edge. Later configuration and external validation evidence supports technical remediation. A clean independent retest remains open, so `AUTOMATED_EXTERNAL_VAPT` remains `NOT_PASS`.

## Release-binding rule

The 2026-09-12 assessment applies to the Production target/release evidenced for that assessment. Later repository or Production releases do not inherit the assessment automatically. Exact-release security acceptance requires separate evidence.

## Current operating rule

Normal engineering, CI, legal/privacy/procurement work, read-only analysis and governed deployment/release workflows may continue under the repository's normal controls.

Any future active Production security testing requires a current written scope/ROE and applicable provider authorization. No active-test continuation authorization is implied by this historical assessment notice.

## Terminal acceptance rule

External security assurance may be promoted to terminal PASS only when all required release-blocking findings are remediated, the required attributable retest is clean/accepted, exact release binding is established, and any buyer-required qualified/manual scope is satisfied.

The canonical current state is:

```text
REPORT_RECEIVED=true
REMEDIATION_TECHNICAL_EVIDENCE=AVAILABLE
CLEAN_RETEST_COMPLETE=false
TERMINAL_SECURITY_GATE=NO_PASS
```
