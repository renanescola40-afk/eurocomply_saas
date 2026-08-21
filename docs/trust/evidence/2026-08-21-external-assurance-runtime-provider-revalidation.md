# External Assurance runtime/provider factual revalidation — 2026-08-21

**Status:** `FACTUAL_CAPTURE_ONLY / NOT_EXTERNAL_ASSURANCE_PASS`  
**Canonical tracker:** GitHub issue `#1727`  
**Observed production release subject:** `b54afdfd6370442e7c7924f31d6210841621cf38`

## Purpose

This record preserves connector-observed provider/runtime facts for External Assurance reconciliation. It is an internal evidence ledger entry. It is **not** a legal opinion, DPA acceptance record, GDPR-compliance statement, independent penetration-test report, certification, or proof of a provider's contractual role.

## Vercel factual observation

Connected Vercel inspection on 2026-08-21 established that the latest production deployment observed for the RISCK COMPLY application was:

- deployment: `dpl_5gJQQGGTKjGG3QJxQ3K87ArMqjDy`;
- target: `production`;
- state: `READY`;
- Git release subject: `b54afdfd6370442e7c7924f31d6210841621cf38`.

The following production public surfaces were then fetched through the connected Vercel authority and returned HTTP `200`:

- `https://www.risckcomply.com/pt/trust`;
- `https://www.risckcomply.com/pt/security`;
- `https://www.risckcomply.com/pt/status`.

The fetched production HTML exposed `sentry-environment=production` and `sentry-release=b54afdfd6370442e7c7924f31d6210841621cf38`, providing an independent runtime cross-signal for the release subject observed at those public surfaces.

This revalidation means the former public-route defect tracked in `#1739` is not carried forward as an unresolved External Assurance procurement-surface blocker for this release. It does **not** prove Vercel contracting entity, DPA applicability, transfer treatment, retention, subprocessor applicability, or any legal conclusion.

## Supabase factual observation

Connected Supabase inspection on 2026-08-21 established:

- project ref: `tganhbbhfxcpblmgqprg`;
- project name: `eurocomply_saas`;
- status: `ACTIVE_HEALTHY`;
- region: `eu-west-1`;
- Postgres engine: `17`;
- database version observed: `17.6.1.127`.

These are provider/project configuration facts only. They do **not** prove the RISCK COMPLY contracting entity, applicable account agreement or DPA, backup/log retention for the subscribed plan, transfer mechanism, subprocessor authorization, storage deletion semantics, or GDPR legal sufficiency.

## External-assurance boundary

The following gates remain outside this factual capture and must not be promoted from it:

- founder legal-entity and corporate factual record;
- eight qualified legal decisions and the master legal decision;
- Privacy/GDPR legal assurance;
- independent penetration testing and any required retest;
- final provider-account/DPA/transfer/retention reconciliation;
- final subprocessor register approval;
- final Enterprise External Assurance closure.

CI, repository documentation, connected-provider inspection, live route availability and Sentry release binding do not substitute for qualified legal review or independent security assurance.

## Staleness rule

Revalidate release-bound facts before describing a newer deployment as the latest live release, and whenever provider configuration, data flow, region, retention, enabled-service scope, or runtime behavior changes materially. Provider contract/DPA evidence has its own agreement/version/effective-date scope and must be reconciled separately.
