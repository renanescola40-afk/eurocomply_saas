# Core Workflow Release Closeout

## Status

Core workflow implementation is code-complete for repository validation.

## Covered in repository checks

- Organization dashboard activity page exists.
- AI systems inventory page exists.
- AI inventory create, detail and reassessment API contracts exist.
- Activity page protection invariant exists.
- AI inventory locale coverage invariant exists.
- AI system relationship schema contract exists.
- Core release smoke contract exists.

## Final runtime gate

Run the deployment smoke command against the real deployment after database migrations are applied.

```bash
npm run release:deployment-smoke
```

The release should only be called fully live after that command writes passing runtime evidence.
