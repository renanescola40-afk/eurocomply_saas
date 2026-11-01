# RISCK COMPLY — Enterprise Evidence Master Report

**Snapshot:** 2026-11-01T19:30:00.000Z  
**Canonical repository:** `renanescola40-afk/eurocomply_saas`  
**Source SHA:** `6b54e899ffd4edd7ce26883f4fc715a3fef098e0`  
**Execution branch:** `enterprise/evidence-factory-v1-20261101`

## Fixed scope
- Mandatory atomic controls: **38/38**
- Formal Category A gates: **24/24**
- Denominators are immutable; each control maps to exactly one gate.

## Source control status (preserved)
| Status | Controls |
|---|---:|
| PASS | 2 |
| BLOCKED | 1 |
| NOT_VERIFIED | 35 |
| Total | **38** |

## Provider evidence captured
| Evidence | Status | Key finding |
|---|---|---|
| DAT-01 — Supabase migration parity | BLOCKED | Production 137 migrations; isolated QA 7; difference 130 |
| DAT-05 — Supabase security advisor | NOT_VERIFIED | 33 INFO RLS-enabled/no-policy findings; 1 WARN leaked-password protection disabled |
| OPS-01 — Vercel deployment identity | NOT_VERIFIED | Production READY SHA 70d3545f... differs from GitHub main 6b54e899... |

- Provider evidence records generated: **3**
- Artifact SHA-256 values recorded: **3**
- Evidence records accepted independently: **0**
- Formal gates eligible for review: **1** (A-09)
- Gate A-18 requires reconciliation; its existing source PASS is preserved but current deployment/main SHA equality is not verified.
- Gate A-12 remains BLOCKED.

## CI / PR
- Draft PR: [#2588](https://github.com/renanescola40-afk/eurocomply_saas/pull/2588)
- Evidence Tests workflow run: `41341793480` — **failure**
- Job had no step records or retrievable logs; runner-level cause cannot be confirmed.
- SHA-256 CI manifest generation is configured in the existing workflow; no separate job/runner was added.

## Decision
**NO-GO for Enterprise 100%.** Provider evidence is captured, but the migration parity blocker, current deployment SHA drift, unreviewed security findings and remaining controls prevent formal closure.
