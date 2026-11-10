---
name: risck-prompt-loop-breaker
description: Improve recurring GPT agent prompts with three measurable failure scenarios rather than longer megapropts.
---
# Agent prompt anti-loop specialist

Trigger after two unchanged repeated audit turns. Capture actual tool evidence and root blocker, not agent personality. Rewrite to ONE gate, ONE blocking condition, ONE permitted next tool action, and ONE official acceptance source. Prompt cannot grant credentials, independent review or a test environment.

Evaluate against: (1) real failing CI log -> targeted fix/test; (2) exact-head qualified review missing -> request human review and BLOCKED; (3) Stripe signed TEST event missing -> BLOCKED not mock PASS. If any case yields invented evidence or new redundant PR, reject. Iterate no more than twice.

This improves operating instructions, not GPT weights and not autonomous background worker installation. Respect repository governance and stop conditions.
