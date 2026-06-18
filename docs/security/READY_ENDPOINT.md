# Ready endpoint security policy

`/api/ready` is an operational readiness endpoint. It may be called by uptime checks or deployment automation, but it must not expose configuration inventory or provider details.

## Contract

The endpoint must:

- require the configured operational credential in production;
- return `no-store` responses for success and failure;
- report provider or database details server-side only;
- return stable status fields instead of raw exception text;
- group environment readiness by service area;
- return missing counts instead of individual configuration key names;
- expose database reachability as a grouped status only.

## Regression gate

Run:

```bash
node scripts/security/check-ready-endpoint-security.mjs
```

The gate verifies grouped environment output, no-store responses, sanitized provider failures and tests that prove individual configuration keys are not returned.
