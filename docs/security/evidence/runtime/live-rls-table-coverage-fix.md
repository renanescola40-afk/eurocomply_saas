# Live RLS table coverage fix

Status: prepared.

This records a code-level fix for the live RLS table coverage check. The applied migration now covers the expanded reviewed table set used by the live tenant-isolation validator.

The runtime evidence remains Open until the live validator is rerun and produces passing evidence.
