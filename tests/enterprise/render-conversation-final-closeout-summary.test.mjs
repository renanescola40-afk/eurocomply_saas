import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { renderConversationFinalCloseoutSummary } from '../../scripts/enterprise/render-conversation-final-closeout-summary.mjs';

const SHA = 'a'.repeat(40);

function write(root, name, value) {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, name), `${JSON.stringify(value)}\n`);
}

test('renders exact-SHA completion summary', () => {
  const root = mkdtempSync(join(tmpdir(), 'risck-closeout-summary-'));
  try {
    write(root, 'retrieval-manifest.json', { status: 'Complete' });
    write(root, 'result.json', {
      status: 'Complete',
      decision: 'CONVERSATION_COMPLETE',
      completionPercentage: 100,
      blockers: [],
    });

    const summary = renderConversationFinalCloseoutSummary({ root, releaseSha: SHA });
    assert.match(summary, /Retrieval: `Complete`/);
    assert.match(summary, /Decision: `CONVERSATION_COMPLETE`/);
    assert.match(summary, /conversation can be closed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('renders bounded blockers without markdown injection', () => {
  const root = mkdtempSync(join(tmpdir(), 'risck-closeout-summary-'));
  try {
    write(root, 'retrieval-manifest.json', { status: 'Open' });
    write(root, 'result.json', {
      status: 'Open',
      decision: 'CONVERSATION_REMAINS_OPEN',
      completionPercentage: 96,
      blockers: [{
        control: 'retrieval`Manifest\nInjected',
        failures: ['exact_sha_artifact_missing`\nInjected'],
      }],
    });

    const summary = renderConversationFinalCloseoutSummary({ root, releaseSha: SHA });
    assert.match(summary, /Blocking evidence/);
    assert.match(summary, /retrieval_Manifest_Injected/);
    assert.match(summary, /exact_sha_artifact_missing__Injected/);
    assert.doesNotMatch(summary, /retrieval`Manifest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects non-canonical release SHA input', () => {
  assert.throws(
    () => renderConversationFinalCloseoutSummary({ releaseSha: 'main' }),
    /release_sha_invalid/,
  );
});
