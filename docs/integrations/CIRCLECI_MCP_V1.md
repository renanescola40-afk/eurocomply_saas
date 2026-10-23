# RISCK COMPLY — CircleCI MCP bridge (V1)

Minimal stdio MCP server; Node.js 20+; **zero external runtime dependencies**. It is designed for local MCP clients that support subprocess / stdio MCP connections. **It is not an installed ChatGPT connector**. ChatGPT's plugin directory does not currently expose a CircleCI connector for this user.

## Configuration

1. Create a CircleCI **personal API token** with the minimum available project access. Never put a token in Git, a chat, an issue, or screenshots.
2. Copy the **project slug** from CircleCI Project Settings. GitHub OAuth and GitHub App slugs differ, so do **not** guess it.
3. Configure your MCP-capable desktop/client with executable \`node\`, args \`["scripts/integrations/circleci-mcp.mjs"]\`, working directory set to this repository root, and protected environment variables:
   - \`CIRCLECI_API_TOKEN\`: privately configured token
   - \`CIRCLECI_PROJECT_SLUG\`: exact project slug
4. Restart the MCP client and use \`circleci_list_pipelines\` to verify that access works.

## Read-only tools

- \`circleci_list_pipelines\` — branch-filtered project pipelines and checked-out revision
- \`circleci_pipeline_workflows\` — statuses for a pipeline
- \`circleci_workflow_jobs\` — job status and numbers
- \`circleci_job_details\` — metadata only; does not fetch logs

All calls go only to \`https://circleci.com/api/v2\`. Responses are bounded and expose no credential. No direct Supabase/Vercel access.

## Trigger tool (disabled by default)

Triggering may consume credits. It requires ALL of:

- \`CIRCLECI_ENABLE_TRIGGER=true\`
- \`CIRCLECI_TRIGGER_BRANCHES\` comma-separated exact allowlist (never \`main\`)
- The user explicitly approves the current credit-consuming action and enters \`approval=OWNER_APPROVED_CIRCLECI_CREDITS\`

Pass \`run_qa_preflight=true\` OR \`run_qa_full=true\` only when that parameter and corresponding branch are supported by the exact checked-out CircleCI config. The server never retries automatically. CircleCI API authentication/provider mode must support this API endpoint; GitHub App projects may require the newer trigger API, which is not implemented in V1.

## Release constraints

This bridge cannot substitute mandatory GitHub checks and must never report a passing CI result until CircleCI returns actual completed job evidence associated with the exact candidate SHA. It never executes database mutations, production cutover or P0-F repair.

## Local smoke check (no token / no network)

\`\`\`sh
node --check scripts/integrations/circleci-mcp.mjs
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node scripts/integrations/circleci-mcp.mjs
\`\`\`

Security and correctness improvements before wider deployment: test under an MCP client, validate API authentication mode, add audit logging without credentials, and add pinned integration tests with mocked CircleCI HTTP responses.
