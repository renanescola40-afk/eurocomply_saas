# Evidence Vault canonical context handoff

Status: Proposed
Date: 2026-10-05

## Context
The published dashboard selects its canonical active, SSO-authorized membership. Evidence Vault instead receives no organization ID from navigation and refuses users with multiple memberships. Production V5 observed this error after the canonical server routes were corrected. No open PR overlaps this work at inspection. This P0 core-workflow blocker outranks editorial improvements; the change is narrow and reversible.

## Decision
Resolve the default tenant on the server using the existing authenticated canonical organization authority and pass its ID into the existing client. Preserve explicit query selection and the existing membership verification, RLS, metadata and upload controls. With no canonical membership, render an explicit unavailable state. Provider/SSO errors propagate; never guess a first membership or add a second selection authority.

## Validation and evidence limits
Exercise the server handoff, absent membership and provider failure. Retain existing Evidence Vault data-plane and UI tests and canonical membership regression tests. Production remains uncorrected until this PR is independently approved, required checks pass, a permitted merge is made and the exact release is deployed and retested. V5 evidence is private and is not committed. No database, billing, permissions or credentials are changed.

## Risks
The client module moves, so source-location tests must follow it without weakening assertions. Explicit query selection remains protected by the existing membership check and database RLS. Other Vault lifecycle controls absent from the current UI remain outside this fix.

## Rollback
Revert this commit. No migration or data reversal is required; multi-membership users again encounter the documented unavailable state.
