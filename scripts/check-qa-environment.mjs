import { validateQaEnvironment } from './qa-environment-guard.mjs';
const result=validateQaEnvironment(process.env);
if(result.checked) {
  if(result.errors.length) {
    console.error('[QA_ENVIRONMENT_GUARD] FAIL: ' + result.errors.join('; '));
    process.exit(1);
  }
  console.log('[QA_ENVIRONMENT_GUARD] PASS: Preview environment metadata validated (runtime writes not yet certified)');
}
