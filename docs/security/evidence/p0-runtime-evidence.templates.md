# P0 Runtime Evidence JSON Templates

These templates are intentionally placeholders. Do not mark any P0 runtime item as `Complete` until the control is actually applied and reviewable evidence exists.

Copy the relevant JSON into `docs/security/evidence/runtime/<evidence-item>.json`, replace every placeholder, and run:

```bash
node scripts/security/check-p0-runtime-evidence-files.mjs
node scripts/security/check-p0-runtime-evidence-register.mjs
```

Never commit secret values, tokens, private keys, connection strings, access-granting URLs, or unredacted screenshots.

## Branch protection applied on `main`

```json
{
  "evidenceItem": "branch-protection-main",
  "status": "Complete",
  "reviewer": "<reviewer-name>",
  "reviewedAt": "<YYYY-MM-DD>",
  "summary": "Branch protection on main was reviewed and requires pull requests, CODEOWNERS review, required status checks, conversation resolution, force-push blocking, and branch deletion blocking.",
  "evidenceLocations": [
    "<redacted-settings-screenshot-or-export-location>",
    "<github-settings-url-or-private-evidence-folder>"
  ],
  "redactionConfirmation": "I confirm all secrets, tokens, keys, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Pull request required before merge",
    "CODEOWNERS review required",
    "Required status checks enforced",
    "Conversation resolution required",
    "Force pushes blocked",
    "Branch deletion blocked"
  ]
}
```

## Required status checks configured

```json
{
  "evidenceItem": "required-status-checks",
  "status": "Complete",
  "reviewer": "<reviewer-name>",
  "reviewedAt": "<YYYY-MM-DD>",
  "summary": "Required status checks for main were reviewed and include the security and quality workflows required by the P0 plan.",
  "evidenceLocations": [
    "<redacted-required-checks-screenshot-or-export-location>",
    "<github-settings-url-or-private-evidence-folder>"
  ],
  "redactionConfirmation": "I confirm all secrets, tokens, keys, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Full Security Suite required",
    "Semgrep required",
    "Gitleaks required",
    "Actionlint required",
    "OSSF Scorecard required",
    "CodeQL required",
    "Dependency Review required",
    "P0 Runtime Evidence required"
  ]
}
```

## Production secrets configured in provider secret stores

```json
{
  "evidenceItem": "production-secrets-provider-stores",
  "status": "Complete",
  "reviewer": "<reviewer-name>",
  "reviewedAt": "<YYYY-MM-DD>",
  "summary": "Production secrets were verified in the provider secret stores. No secret values are stored in repository files or issue comments.",
  "evidenceLocations": [
    "<redacted-provider-settings-screenshot-or-export-location>",
    "<private-evidence-folder>"
  ],
  "redactionConfirmation": "I confirm all secrets, tokens, keys, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Vercel or deployment provider production secrets configured",
    "Supabase project secrets configured where applicable",
    "GitHub Environment secrets configured where applicable",
    "Audit-chain or evidence signing secret configured where applicable",
    "No secret values committed"
  ]
}
```

## Supabase live RLS validation completed

```json
{
  "evidenceItem": "supabase-live-rls-validation",
  "status": "Complete",
  "reviewer": "<reviewer-name>",
  "reviewedAt": "<YYYY-MM-DD>",
  "summary": "Live Supabase RLS validation was run against the target project. Cross-tenant reads and writes were denied for user-session paths, and service-role paths were reviewed separately.",
  "evidenceLocations": [
    "<redacted-ci-run-or-terminal-output-location>",
    "<private-evidence-folder>"
  ],
  "redactionConfirmation": "I confirm all secrets, tokens, keys, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Cross-tenant read denied",
    "Cross-tenant write denied",
    "Tenant-scoped read allowed only for owning tenant",
    "Tenant-scoped write allowed only for owning tenant",
    "Service-role paths reviewed separately from user-session paths"
  ]
}
```

## External security review or pentest completed

```json
{
  "evidenceItem": "external-security-review-or-pentest",
  "status": "Complete",
  "reviewer": "<reviewer-name>",
  "reviewedAt": "<YYYY-MM-DD>",
  "summary": "External security review or pentest was completed. Critical findings are closed, high findings are closed or formally accepted, and retest evidence is available where applicable.",
  "evidenceLocations": [
    "<private-pentest-report-location>",
    "<retest-evidence-location>"
  ],
  "redactionConfirmation": "I confirm all secrets, tokens, keys, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "External review or pentest completed",
    "Critical findings resolved",
    "High findings resolved or formally accepted",
    "Retest evidence attached where applicable",
    "Release owner reviewed report summary"
  ]
}
```

## Formal private-beta exception

Use this only when a runtime control cannot be completed before a private beta and a release owner explicitly accepts the risk.

```json
{
  "evidenceItem": "<one-of-the-runtime-evidence-items>",
  "status": "Exception",
  "reviewer": "<reviewer-name>",
  "reviewedAt": "<YYYY-MM-DD>",
  "summary": "A time-bound private-beta exception was approved for this P0 runtime control.",
  "evidenceLocations": [
    "<risk-acceptance-approval-location>",
    "<private-evidence-folder>"
  ],
  "redactionConfirmation": "I confirm all secrets, tokens, keys, connection strings, and access-granting values are redacted.",
  "exception": {
    "riskOwner": "<risk-owner-name>",
    "rationale": "<why-this-exception-is-needed>",
    "compensatingControls": [
      "<temporary-control-1>",
      "<temporary-control-2>"
    ],
    "expiryDate": "<YYYY-MM-DD>",
    "approvalReference": "<approval-issue-or-document-reference>"
  }
}
```
