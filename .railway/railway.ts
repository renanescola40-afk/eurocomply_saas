import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const production = ctx.environment === "production";

  const web = service("risck-comply-web", {
    source: github("renanescola40-afk/eurocomply_saas", { branch: "main" }),
    build: "npm run build",
    start: "npm run start",
    healthcheck: "/api/health",
    healthcheckTimeout: 300,
    replicas: production ? 1 : 1,
  });

  return project("risck-comply-failover", {
    resources: [web],
  });
});
