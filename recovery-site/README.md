# Public recovery site — RISCK COMPLY

This is an isolated, **temporary institutional website**, not the commercial SaaS.

## Safe publishing target

Deploy the **contents of this `recovery-site/` directory** to a **new, separate Netlify site**. Do **not** publish it on the existing `risck-qa-isolated` site and do **not** replace the repository's root `netlify.toml` or release guards.

For a manual Netlify Drop, drag the local `recovery-site/` directory containing `index.html` and `_headers`. For Git-based deployment of this monorepo, set the Netlify site's base directory to `recovery-site` and explicitly validate the effective build/publish configuration; do not connect main production automatically without review.

Before DNS cutover, inspect the generated `*.netlify.app` URL, confirm HTTPS, the expected static page and headers, check the email destination, and confirm that no authenticated application or billing route is exposed. The email address is from the existing repository but mailbox delivery is not independently tested.

Only then add the public domain in the new site, obtain exact Netlify DNS values, inspect Cloudflare DNS/proxy/SSL settings and update the necessary records with rollback instructions. Preserve mail DNS records. No checkout or customer signup is permitted until separate commercial release approval.

## Security / scope

- No Supabase/Stripe credentials, script dependencies, forms or customer data.
- Content Security Policy, noindex metadata and basic security headers.
- No claim of certification, client access, regulatory approval or completed external audit.
- Site is a candidate, not evidence that DNS or Netlify production is configured.
- Repository `main` is unchanged until independent review and merge.

## Recovery

Restore previously documented healthy DNS target if possible; do not treat the paused Vercel deployment as a working rollback.
