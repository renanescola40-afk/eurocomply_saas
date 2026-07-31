# Supabase Migration Review Dossiers

## Purpose

Generate one review dossier for every migration in the immutable reconciliation inventory by combining the exact inventory with exact-SHA read-only live schema evidence.

## Inputs

- the artifact from **Supabase Production Migration Dry Run**;
- the artifact from **Supabase Live Schema Evidence**;
- the same full current `main` SHA for both runs.

The workflow verifies run provenance before using either artifact.

## Output

The retained artifact contains:

- `migration-review-dossiers.json` with all migrations;
- one Markdown dossier per migration;
- inventory and schema-evidence digests;
- extracted objects and observed presence;
- explicit gaps and unsupported semantics;
- blank human-review fields.

## Safety boundary

The dossier generator:

- does not connect to the database;
- does not execute SQL;
- does not modify migration history;
- does not infer that a migration is applied;
- does not assign a migration classification;
- does not authorize `migration repair`, dry-run, or production deployment.

Even when every extracted object exists, `provesMigrationApplied` remains `false`, `automaticClassification` remains `null`, and `reviewRequired` remains `true`.

## Review process

For each dossier, the reviewer must inspect the exact SQL and determine whether additional evidence is required for:

- columns and constraints;
- indexes and uniqueness semantics;
- function bodies and security-definer behavior;
- policy predicates and grants;
- trigger behavior;
- data backfills or transformations;
- ordering and rollback.

The reviewer then transfers an evidence-backed decision into the sealed migration decision document validated by the migration decision gate.

## Promotion rule

Dossiers reduce review effort but provide no release credit. Issue #1415 remains open until all decisions are sealed, independently approved, staged where required, dry-run validated, and reconciled after execution.
