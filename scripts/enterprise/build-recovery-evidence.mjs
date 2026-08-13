#!/usr/bin/env node

// RETIRED: this legacy helper previously generated rollback/restore evidence from
// caller-provided booleans and aggregate counters. That made it possible for an
// automatic backup/restore drill to emit rollback-looking evidence without a
// controlled rollback actually being executed.
//
// Canonical recovery evidence is now produced only by:
// - scripts/recovery/run-backup-restore-exercise.mjs
// - scripts/recovery/run-live-rollback-exercise.mjs
// and validated by scripts/recovery/check-recovery-evidence.mjs.

console.error('retired_synthetic_recovery_evidence_builder: use canonical recovery proof scripts');
process.exitCode = 1;
