# RISCK COMPLY — Provider Transfer / Change-of-Control Review

Date: 2026-10-05
Scope: M&A requirement 34 — provider terms impacting transfer
Status: CLOSED_FOR_DILIGENCE_REVIEW
Execution status: NOT_EXECUTED

## Conclusion

The material provider set has been reviewed for documented ownership-transfer, project-transfer, organization-handover, domain-claim, or equivalent buyer-admin mechanisms. This closes the diligence question "what happens to provider accounts/assets at transfer?" It does **not** claim that any transfer has been executed, accepted by a buyer, or approved by a provider for a specific transaction.

## Provider map

| Provider | Documented mechanism / limitation | Closing implication |
|---|---|---|
| Vercel | Team ownership can be handed to another Owner; projects can be transferred between teams. Project transfer moves deployments, most configuration, domains/aliases, administrators and Git linkage, while some integrations/log data and certain resources require separate handling. | Add buyer owner, verify payment method, transfer project/domain where appropriate, then rotate secrets/integrations. |
| Supabase | Projects can be transferred between organizations if source-owner and target-membership prerequisites are met. Active GitHub integration, project-scoped roles and log drains can block transfer; billing splits at transfer time. | Pre-clear blockers, add buyer target org/member, transfer project, then validate auth/storage/functions and billing. |
| Stripe | Stripe explicitly documents ownership transfer and business-sale/acquisition account transfer. Entity changes may require Stripe Support; legal name, tax ID, payout bank and account-owner email may need updating. Cross-country acquisitions can require a different process. | Treat as provider-assisted closing work; do not assume silent legal-entity substitution. |
| Google Cloud / OAuth project | Google Cloud projects can be moved within resource hierarchy and migration between organizations has policy/IAM implications. | Buyer handover requires IAM/org-policy review and billing-project reconciliation before removing seller admins. |
| GitHub | Repositories can be transferred to another user or organization; target naming/fork restrictions and plan-feature changes can apply. Organization ownership can be handed to another owner with separate billing update. | Prefer buyer organization ownership at closing; preserve branch protections/actions/secrets and verify feature parity. |
| Sentry | Sentry supports inviting organization members and assigning the Owner role, which has unrestricted organization/settings/billing authority. | Buyer handover can be performed through owner-role transition; account-specific billing/legal identity still requires closing verification. |
| Upstash | Teams support Admin/Finance/Dev access; databases can be moved to a target team via the documented move-to-team endpoint. The original creator retains the unique team Owner role. | Move databases to a buyer-controlled team rather than relying on reassignment of the original team-owner identity. |
| Resend | Resend Domain Claim allows a verified domain to be moved between teams; recent sending activity can require support release. | Buyer team should claim/verify the domain and recreate/rotate API credentials; support may be needed when recent traffic exists. |
| PostHog | PostHog documents project moves between organizations in the same region by an owner/admin of both organizations; cross-region moves require PostHog assistance and billing must be reconciled. | Choose target org/region, move project, confirm access isolation and final partial invoices. |

## Official-source references

- Vercel team ownership: https://vercel.com/kb/guide/how-do-i-transfer-ownership-of-a-vercel-team
- Vercel project transfer: https://vercel.com/docs/projects/transferring-projects
- Supabase project transfer: https://supabase.com/docs/guides/platform/project-transfer
- Supabase organization ownership: https://supabase.com/docs/guides/platform/access-control
- Stripe business-sale/acquisition transfer: https://support.stripe.com/questions/transfer-a-stripe-account-to-a-different-entity-due-to-a-business-sale-or-acquisition
- Stripe account ownership: https://support.stripe.com/questions/change-the-owner-of-a-stripe-account
- Google Cloud project moves: https://docs.cloud.google.com/resource-manager/docs/moving-projects-folders
- GitHub repository transfer: https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository
- GitHub organization ownership: https://docs.github.com/en/organizations/managing-organization-settings/transferring-organization-ownership
- Sentry organization member roles: https://docs.sentry.io/api/organizations/add-a-member-to-an-organization/
- Sentry role updates: https://docs.sentry.io/api/organizations/update-an-organization-members-roles/
- Upstash teams: https://upstash.com/docs/common/account/teams
- Upstash database move-to-team: https://upstash.com/docs/devops/developer-api/redis/moveto_team
- Resend Domain Claim: https://resend.com/changelog/domain-claim
- PostHog organization/project consolidation: https://posthog.com/handbook/growth/revops/billing-consolidation

## Truth boundary

CLOSED here means the transfer/change-of-control **terms and operational handover path are known and documented** for diligence. It does not close provider requirements 91-98, because those separately require current account-owner/billing-owner/account-specific evidence and actual closing execution.
