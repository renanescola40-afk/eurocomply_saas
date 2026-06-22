# P1 Edge Protection Evidence Builder

This helper writes the final P1 WAF/CDN/DDoS evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-edge-protection-evidence.mjs input.json docs/security/evidence/p1/waf-cdn-ddos.json
```

Then run the existing validator for the final file.

Only use reviewed edge protection evidence. Do not mark the control complete with sample data.
