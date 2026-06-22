# Backup and recovery

Status: enterprise review note. This document describes intended recovery posture and evidence boundaries.

## Current position

EuroComply uses managed infrastructure providers. Database, storage and deployment backup behavior depends on the configured provider plans and project settings.

## Customer-safe commitments

- Backup and restore evidence must be collected from the active production providers before making contractual promises.
- Formal disaster recovery exercises are not currently claimed as complete.
- RTO and RPO values must not be promised unless approved in a customer agreement and backed by test evidence.

## Operational checklist

- Confirm provider backup settings for the production database.
- Confirm storage recovery options for controlled documents.
- Record the last restore test date when available.
- Record recovery owner, escalation path and customer communication process.

## Customer-safe answer

EuroComply is designed to support managed backup and recovery workflows through its infrastructure providers. Tested restore evidence and contractual recovery targets must be confirmed before being shared as commitments.
