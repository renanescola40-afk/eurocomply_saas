# JSON body limit policy

RISCK COMPLY API routes must not parse mutable JSON request bodies with `request.json()` directly. Direct parsing skips route-level byte limits and can turn authenticated or public endpoints into avoidable memory/CPU abuse surfaces.

## Required pattern

Use `readBoundedJsonRequest` from `src/lib/security/validate.ts` for JSON request bodies in `src/app/api/**`.

The helper enforces all of the following before returning parsed input:

- JSON `Content-Type` by default, including `application/*+json` media types;
- pre-read `Content-Length` rejection when the declared body is larger than the route limit;
- post-read byte-length enforcement before `JSON.parse`;
- stable `ValidationError` failures without raw parser/provider details;
- sanitized no-store validation responses through `validationErrorResponse`.

Routes should choose the smallest practical limit for their payload class. Examples currently used by mutable APIs:

- billing checkout and checkout intent: 2 KiB;
- team invite and GDPR delete-request metadata: 4 KiB;
- document approval metadata: 8 KiB;
- AI governance forms: 64 KiB.

## CI enforcement

`scripts/security/check-json-body-limits.mjs` fails when:

- `src/lib/security/validate.ts` stops enforcing content type, content length or post-read size checks;
- unit coverage for bounded JSON parsing is removed;
- any `src/app/api/**` TypeScript file calls `request.json()` directly.

The JSON body gate is delegated from `security:enterprise-api`, which is part of `security:ci`.
