# Prelaunch waitlist resolution status

Status: code-level mitigation complete.

Controls in place:

- Public submissions are bounded, rate-limited and no-store.
- The dedicated waitlist table is attempted first.
- The existing sales lead table is used as durable fallback.
- A webhook fallback is available when database capture is degraded.
- Internal notification still runs when durable capture is degraded or a new lead is inserted.
- The public response remains successful after a saved submission even when confirmation is unavailable.
- The controlled-launch landing does not render floating public auth shortcuts.

Remaining production verification:

- Confirm the latest main branch is deployed by Vercel.
- Submit one manual test through the production waitlist form.
- Confirm the lead exists in at least one durable capture path.
