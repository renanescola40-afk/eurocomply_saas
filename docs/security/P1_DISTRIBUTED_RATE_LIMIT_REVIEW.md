# P1 Distributed Rate Limit Review Checklist

Before marking this control complete, verify:

- [ ] Rate limit state is shared across instances.
- [ ] Sensitive endpoints have explicit policies.
- [ ] Keying strategy is documented.
- [ ] Bypass paths are documented or blocked.
- [ ] Alerting exists for sustained throttling or abuse.
- [ ] Evidence references are durable and redacted.
- [ ] No secrets or access-granting values are committed.
