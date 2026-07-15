# ADR: Trust document scan provenance, not caller metadata

Date: 2026-07-15
Status: Proposed
Priority: P1 security and AI-governance evidence integrity

## Context

Enterprise document creation requires a clean malware-scan outcome. The shared document-record function previously inferred trust from metadata supplied in `CreateDocumentInput`.

Two caller-controlled shapes were accepted:

- `source: template` with `serverGenerated: true`;
- a complete-looking set of `scanStatus`, `scanProvider`, `scanCheckedAt`, `fileHash`, `fileSize`, and `mimeDetected` fields.

Because those fields were data rather than authenticated provenance, direct document creation could claim a trusted origin or clean scan without executing the validated upload pipeline. This finding is based on repository control flow. It does not assert observed exploitation, customer impact, malware execution, external audit, or penetration-test evidence.

## Decision

Document-record creation now receives provenance from the server-side call path:

- `untrusted_metadata` for direct `createDocument` calls;
- `validated_upload` only after file validation and malware scanning complete;
- `server_generated` only through the template-generation path.

When enterprise malware scanning is required, `untrusted_metadata` fails closed regardless of metadata content. Caller metadata remains useful for evidence fields but cannot grant trust.

The template action uses the explicit server-generated path. The upload action supplies validated-upload provenance only after the existing validation, scan, block decision, and storage upload sequence.

## Consequences

### Positive

- forged clean-scan metadata cannot bypass the enterprise gate;
- forged `serverGenerated` metadata cannot bypass the enterprise gate;
- trusted origin is represented by control flow rather than a mutable payload;
- existing tenant authorization, storage-path validation, scanning, audit logging, and no-secret behavior remain unchanged.

### Risks and limitations

- the trusted functions are still internal application functions, not cryptographic attestations;
- repository tests do not prove the external malware-scanner provider or production storage behavior;
- template generation is trusted because content is constructed server-side from repository templates; this does not certify template content as legally compliant or independently reviewed;
- storage cleanup remains best-effort if a later document-record write fails and is outside this change.

## Tests

Focused tests cover rejection of forged complete clean-scan metadata, rejection of forged server-generated metadata, no database write on rejection, audit evidence for the blocked attempt, and continued operation of the explicit server-generated path.

GitHub Actions on the exact pull-request head are authoritative. No runtime evidence artifact is created or upgraded by this change.

## Rollback

Revert the pull request. That would restore metadata-derived trust and is not recommended. No database migration, credential rotation, provider change, customer-data rewrite, or deployment rollback is required.
