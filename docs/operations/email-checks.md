# Email checks

Run these commands before release:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Confirm the sending domain is verified in Resend and the needed DNS records are configured.

Send sample messages for onboarding, invite, billing, invoice failure, deadline reminder and security alert.

Confirm delivery logs include recipient, recipient hash, template, status, provider id and attempts. Do not store message bodies.

Check Gmail and Outlook. Authentication should pass and test messages should not land in junk folders.
