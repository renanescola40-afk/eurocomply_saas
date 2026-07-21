import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const workflow=readFileSync('.github/workflows/recovery-resilience-proof.yml','utf8');
const rollback=readFileSync('scripts/recovery/run-live-rollback-exercise.mjs','utf8');
const restore=readFileSync('scripts/recovery/run-backup-restore-exercise.mjs','utf8');
const validator=readFileSync('scripts/recovery/check-recovery-evidence.mjs','utf8');
describe('recovery resilience promotion megapack',()=>{
 it('executes both protected exercises in exact-SHA full mode',()=>{ for(const token of ['release_sha:','- full','EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK','environment: production-recovery','git rev-parse origin/main',"inputs.exercise == 'full' || inputs.exercise == 'backup-restore'", "inputs.exercise == 'full' || inputs.exercise == 'production-rollback'",'recovery-resilience-proof-${{ inputs.release_sha }}']) expect(workflow).toContain(token); expect(workflow).not.toContain('continue-on-error: true'); });
 it('emits exact-SHA promotable rollback and restore evidence',()=>{ for(const token of ["controlsVerified: ['REC-01', 'REC-02', 'REC-03', 'REC-04']",'observedSha',"runId: env('GITHUB_RUN_ID')",'containsSensitiveValues: false',"redirect: 'error'"]) expect(rollback).toContain(token); for(const token of ["controlsVerified: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10']",'singleDescriptorInspection: true','rpoMeasured','rtoMeasured','containsSensitiveValues: false']) expect(restore).toContain(token); });
 it('requires the selected canonical evidence set and matching provenance',()=>{ for(const token of ["['full', 'backup-restore', 'production-rollback']",'requireRollback','requireRestore','recovery evidence run ID mismatch','containsSensitiveValues','REC-10']) expect(validator).toContain(token); expect(validator).not.toContain('existsSync('); });
});
