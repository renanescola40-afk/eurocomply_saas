---
name: risck-enterprise-gate-closer
description: Execute one RISCK COMPLY A-gate or atomic control to a verifiable decision, avoiding repeated audit loops.
---
# Single-gate enterprise executor

Read AGENTS.md, docs/ENGINEERING_CONSTITUTION.md, both canonical G1 configs, latest related PR, and the existing official evidence validator. This Skill gives no new access or approval authority.

1. Select exactly one A-01..A-24 gate and run node scripts/agents/enterprise-gate-packet.mjs --gate A-18 (substitute requested gate). This output is *advisory source state*, NOT current acceptance.
2. Read current GitHub PR HEAD/checks/reviews, QA or provider results, and actual immutable evidence. Never infer latest state from a frozen source percentage.
3. Act now: perform exactly one authorized provider test or tightly scoped fix, or request the one qualified independent human action. Reuse existing accepted proofs; never do another whole-repo audit for an unchanged blocker.
4. If all required evidence exists, run the existing node scripts/enterprise-evidence/validate-evidence.mjs --report with its authentic provider context. Follow required exact-HEAD and post-merge checks.
5. If the same blocker survives two attempts with no new evidence, STOP and report BLOCKED with the exact tool access, reviewer, evidence URL or credential needed. No new PR to circumvent that blocker.

Required handoff: gate and atomic IDs, current HEAD, environment, actual action taken, provider/test result+URL, canonical validator result, and ACCEPTED (only provider-backed official PASS), BLOCKED (named dependency), or IN_PROGRESS (one real changed condition). Do not self-approve, merge or reinterpret controls.

Production read-only; Stripe TEST only; no customer email, paid services, secret exposure, automated merging, workflow bypasses, fabricated PASS, synthetic reviewer identity, new competing validator, or authorization changes.
