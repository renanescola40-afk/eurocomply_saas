# Restore Drill Control Map

| Control | Repository implementation | Runtime evidence | Failure state |
| --- | --- | --- | --- |
| Exact release binding | GitHub API comparison with current `main` | Source SHA equals promoted SHA | Rejected |
| Source provenance | Same repository and successful workflow run | GitHub run metadata | Rejected |
| Approval boundary | Protected `production` environment | Approved deployment record | External validation required |
| Isolated recovery target | Mandatory boolean assertion | Provider target record | Rejected |
| No production mutation | Mandatory false assertion | Change/audit record | Rejected |
| Backup availability | Mandatory check | Provider backup record | Rejected |
| Restore completion | Mandatory check | Provider restore record | Rejected |
| RPO/RTO | Numeric contract | Operator timestamps and provider logs | Rejected |
| Schema and migrations | Mandatory checks | Object-level comparison | Rejected |
| RLS and tenant isolation | Mandatory checks | Synthetic cross-tenant denial results | Rejected |
| Auth boundary | Mandatory check | Protected-route smoke results | Rejected |
| Critical counts | Mandatory check | Sanitized aggregate comparison | Rejected |
| Application smoke | Mandatory check | Health/readiness/product smoke | Rejected |
| Cleanup | Mandatory check | Target deletion/quarantine record | Rejected |
| Redaction | Forbidden key/value scanner | Sanitized JSON only | Rejected |
| Independent review | Operator/approver separation assertion | Approval record | Rejected |
| Integrity | SHA-256 of canonical source JSON | Promoted digest | Rejected |
| Retention | 365-day artifact setting | GitHub artifact metadata | External validation required |

## Enterprise Go dependency

Restore and disaster-recovery controls remain `NOT_VERIFIED` until an exact-main promoted artifact exists and the provider-side evidence has been approved. A passing repository contract test alone must never raise the runtime score.
