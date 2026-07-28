#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.argv[2] ?? 'artifacts/stripe-entitlement-runtime-proof/replay.json');
if (!existsSync(path)) throw new Error(`Replay evidence not found: ${path}`);
const replay = JSON.parse(readFileSync(path, 'utf8'));

const required = {
  sameEventId: replay.sameEventId === true,
  firstDeliveryProcessed: replay.firstDelivery?.processed === true,
  secondDeliveryDuplicate: replay.secondDelivery?.duplicate === true,
  snapshotCountStable: replay.before?.snapshotCount === replay.after?.snapshotCount,
  policyVersionStable: replay.before?.policyVersion === replay.after?.policyVersion,
  seatLimitsStable: JSON.stringify(replay.before?.seatLimits) === JSON.stringify(replay.after?.seatLimits),
  noSecondReconciliation: replay.after?.reconciliationCount === replay.before?.reconciliationCount,
};

const failed = Object.entries(required).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`Stripe replay safety failed: ${failed.join(', ')}`);
console.log(JSON.stringify({ status: 'passed', checks: required }, null, 2));
