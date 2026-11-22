# RISCK COMPLY — isolated public recovery site

This directory contains a **temporary static institutional website**. It is NOT the commercial Next.js SaaS. Signup, billing and customer workspace access remain disabled.

## Netlify site isolation — mandatory

Publish this folder to a **new, separate Netlify project**, never to the existing private `risck-qa-isolated` site. Do not override or weaken the repository-root `netlify.toml` QA guard.

### Git-backed static site

Following Netlify's monorepo configuration rules:

1. Create a separate Netlify project from the approved Git repository/ref, only once authorized and within the existing no-new-cost limit.
2. Under Project configuration → Continuous deployment → Build settings, leave **Base directory** unset (repository root).
3. Set **Package directory** to `recovery-site` (this makes Netlify select the dedicated `recovery-site/netlify.toml` before the root config).
4. Use **Build command** = empty and **Publish directory** = `recovery-site`, relative to the repository root. The local `netlify.toml` declares both values.
5. Validate the effective build configuration in provider logs before publishing. A Next.js build or `scripts/netlify-qa-build.mjs` execution means the wrong site/build config was selected; **stop** instead of bypassing guards.
6. Use a reviewed release ref/commit. A draft PR is not an approved production artifact.

### Manual static deployment

Alternatively, use Netlify Drop and upload only the `recovery-site` directory (or a ZIP with these files at its root). This does not require building Next.js. Never drop the entire application repository.

### Pre-domain checks

Visit the resulting `*.netlify.app` URL and confirm page, valid HTTPS, expected security headers, stable HTTP responses, and that signup, checkout and protected app routes are not present. The commercial email address is sourced from the repository; actual mailbox delivery has NOT been verified.

Only after that, attach `www.risckcomply.com` and the apex domain to the **correct** Netlify project. Obtain Netlify's exact DNS recommendations, inspect real Cloudflare DNS/proxy/SSL records, preserve MX/TXT email records, prepare the rollback target and then perform the independently approved cutover. Do not treat a paused Vercel deployment as a healthy rollback.

## Safety constraints

- No application secrets, Supabase credentials, Stripe keys, scripts, cookies, forms or customer data.
- No claims of certifications, legally guaranteed compliance, operational SaaS availability or security signoff.
- The temporary public information site has `noindex` until the verified commercial release replaces it.
- No PR merge, Netlify production action or Cloudflare DNS action is authorized solely by this README.

## References

- https://docs.netlify.com/build/configure-builds/monorepos/
- https://docs.netlify.com/build/configure-builds/file-based-configuration/
- https://docs.netlify.com/deploy/create-deploys/
