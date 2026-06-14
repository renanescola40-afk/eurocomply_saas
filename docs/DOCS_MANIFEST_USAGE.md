# Docs Manifest Usage

This project includes a small utility that writes a machine-readable manifest for Markdown files under `docs/`.

## Command

```bash
node scripts/docs/write-docs-manifest.mjs docs-manifest.json
```

## Output

The output JSON includes:

- generation timestamp
- root directory
- file count
- relative path for each Markdown file
- byte size for each file
- SHA-256 digest for each file

## Use cases

Use this manifest to:

- preserve a lightweight index of documentation state
- compare documentation bundles across releases
- attach documentation fingerprints to an approval packet
- detect whether a documentation artifact changed after review

## Suggested review flow

1. Generate the manifest.
2. Attach the generated JSON to the review packet.
3. Regenerate the manifest after changes.
4. Compare the JSON files before final approval.

## Notes

The utility does not upload anything and does not contact external services. It only reads local Markdown files and writes a local JSON file.
