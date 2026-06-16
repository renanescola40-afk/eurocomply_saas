# P0 Runtime Evidence Examples

Use these examples as templates for evidence issues or private evidence files.

Do not commit secret values, tokens, private connection strings, provider credentials, or screenshots that expose access-granting values.

## Branch protection applied on main

```json
{
  "evidenceItem": "branch-protection-main",
  "status": "Complete",
  "reviewer": "Release owner name",
  "reviewedAt": "YYYY-MM-DD",
  "summary": "Branch protection for main was reviewed and shows pull request requirement, CODEOWNERS review requirement, conversation resolution, force-push block, branch deletion block, and required status checks.",
  "evidenceLocations": [
    "Private redacted screenshot or settings export reference"
  ],
  "redactionConfirmation": "All secrets, tokens, credentials, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Require pull request before merging",
    "Require CODEOWNERS review",
    "Require conversation resolution",
    "Block force pushes",
    "Block branch deletion"
  ]
}
```

## Required status checks configured

```json
{
  "evidenceItem": "required-status-checks",
  "status": "Complete",
  "reviewer": "Release owner name",
  "reviewedAt": "YYYY-MM-DD",
  "summary": "Required status checks for main were reviewed and include the security and release gates required before protected branch merge.",
  "evidenceLocations": [
    "Private redacted screenshot or settings export reference"
  ],
  "redactionConfirmation": "All secrets, tokens, credentials, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Full Security Suite / Run expanded security gates",
    "Semgrep / Run Semgrep SAST",
    "Gitleaks / Scan repository for accidental secret exposure",
    "Actionlint / Lint GitHub Actions workflows",
    "OSSF Scorecard / Run OSSF Scorecard",
    "CodeQL",
    "Dependency Review",
    "P0 Runtime Evidence / Validate P0 runtime evidence register"
  ]
}
```

## Production secrets configured in provider secret stores

```json
{
  "evidenceItem": "production-secrets-provider-stores",
  "status": "Complete",
  "reviewer": "Release owner name",
  "reviewedAt": "YYYY-MM-DD",
  "summary": "Production secrets were reviewed in the provider secret stores and no secret values were committed to the repository or exposed in release evidence.",
  "evidenceLocations": [
    "Private redacted provider settings screenshot or export reference"
  ],
  "redactionConfirmation": "All secrets, tokens, credentials, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Vercel or deployment provider production secrets configured",
    "Supabase secrets configured outside source control",
    "GitHub Environment secrets configured where applicable",
    "Audit-chain and evidence-pack signing secrets configured where applicable"
  ]
}
```

## Supabase live RLS validation completed

```json
{
  "evidenceItem": "supabase-live-rls-validation",
  "status": "Complete",
  "reviewer": "Security reviewer name",
  "reviewedAt": "YYYY-MM-DD",
  "summary": "Live Supabase RLS validation was executed against the target project and showed cross-tenant read and write denial for user-session paths. Service-role paths were reviewed separately.",
  "evidenceLocations": [
    "Private redacted command output or CI run reference"
  ],
  "redactionConfirmation": "All secrets, tokens, credentials, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "Cross-tenant read denied",
    "Cross-tenant write denied",
    "User-session paths validated",
    "Service-role paths reviewed separately"
  ]
}
```

## External security review or pentest completed

```json
{
  "evidenceItem": "external-security-review-or-pentest",
  "status": "Complete",
  "reviewer": "Release owner name",
  "reviewedAt": "YYYY-MM-DD",
  "summary": "External security review or pentest was completed, critical findings were resolved, and high findings were resolved or formally accepted with risk ownership.",
  "evidenceLocations": [
    "Private pentest report or external review reference"
  ],
  "redactionConfirmation": "All secrets, tokens, credentials, connection strings, and access-granting values are redacted.",
  "controlsVerified": [
    "External review completed",
    "Critical findings resolved",
    "High findings resolved or accepted",
    "Retest evidence attached where applicable"
  ]
}
```

## Exception example

```json
{
  "evidenceItem": "external-security-review-or-pentest",
  "status": "Exception",
  "reviewer": "Release owner name",
  "reviewedAt": "YYYY-MM-DD",
  "summary": "Private beta exception was approved for external security review timing with compensating controls and explicit expiry before public production or enterprise procurement.",
  "evidenceLocations": [
    "Private risk acceptance reference"
  ],
  "redactionConfirmation": "All secrets, tokens, credentials, connection strings, and access-granting values are redacted.",
  "exception": {
    "riskOwner": "Risk owner name",
    "rationale": "External review is scheduled but not complete before private beta scope.",
    "compensatingControls": [
      "Private beta only",
      "Restricted tenant access",
      "Manual release approval",
      "No enterprise procurement claims"
    ],
    "expiresAt": "YYYY-MM-DD",
    "approvalReference": "Private approval reference"
  }
}
```
