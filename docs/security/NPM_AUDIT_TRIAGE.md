# npm Audit Triage

EuroComply treats `npm audit --audit-level=moderate` as a blocking CI control. High and critical findings are release blockers until fixed or explicitly triaged with owner-approved evidence.

## CI command

The Full Security Suite runs:

```bash
npm audit --audit-level=moderate
```

The application security gate also runs:

```bash
npm run security:ci
```

which includes `security:npm-audit:all`.

## Triage requirements

Every high or critical advisory must have:

- advisory identifier or package name;
- severity;
- affected dependency path;
- exploitability and reachability decision;
- owner;
- remediation decision: `fixed`, `upgrade-planned`, `accepted-risk`, or `false-positive`;
- remediation deadline or accepted-risk expiry;
- link to CI evidence, pull request, or issue.

Moderate advisories should be fixed where practical. A moderate advisory may proceed only when the release owner confirms it is not reachable in production or is already covered by compensating controls.

## Blocking rule

A pull request or release is **not enterprise-ready** when:

- the Full Security Suite audit step fails and no triage record exists;
- a high or critical advisory has no owner;
- accepted risk has no expiry;
- a remediation deadline has passed;
- the dependency review action blocks a package or license; or
- the lockfile was changed without dependency review evidence.

## Triage table

| Date | Package / advisory | Severity | Reachability | Decision | Owner | Deadline / expiry | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _YYYY-MM-DD_ | _package / GHSA/CVE_ | _high/critical_ | _reachable/not reachable_ | _fixed/upgrade-planned/accepted-risk/false-positive_ | _owner_ | _YYYY-MM-DD_ | _CI run, PR, issue_ |

## Release evidence

Attach these artifacts to the release evidence package:

- Full Security Suite run URL;
- `npm-audit.json` or GitHub Actions audit artifact;
- this triage document when any advisory remains open;
- dependency review result for manifest or lockfile changes;
- SBOM artifact `eurocomply-sbom`.
