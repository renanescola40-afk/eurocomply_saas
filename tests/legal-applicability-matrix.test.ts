import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..");
const authority = readFileSync(
  resolve(repoRoot, "docs/legal-assurance/CURRENT_LEGAL_AUTHORITY.md"),
  "utf8",
);
const predecessor = readFileSync(
  resolve(repoRoot, "docs/legal-assurance/LEGAL_APPLICABILITY_MATRIX_V2_2026-09-14.md"),
  "utf8",
);
const inventory = readFileSync(
  resolve(repoRoot, "docs/legal-assurance/RISCK_COMPLY_REGULATORY_FEATURE_INVENTORY_V1_2026-09-14.md"),
  "utf8",
);
const scorecard = readFileSync(
  resolve(repoRoot, "docs/legal-assurance/LEGAL_LAUNCH_SCORECARD_V1_2026-09-14.md"),
  "utf8",
);

describe("current legal applicability authority", () => {
  it("records the accepted release as deterministic with no evidenced model runtime", () => {
    expect(inventory).toContain("found no Production import or invocation");
    expect(inventory).toContain("no model-driven generation or conversational AI runtime");
    expect(inventory).toContain("AI_MODEL_USED: no model invocation evidenced");
  });

  it("uses the current authority register for historical-workstream migration", () => {
    const dispositions = {
      LEGAL_RULES: "APPLICABLE_STATUTORY_REQUIREMENT",
      ARTICLE_5: "NOT_APPLICABLE_CURRENT_RELEASE",
      ARTICLE_50: "NOT_APPLICABLE_CURRENT_RELEASE",
      FRIA: "NOT_APPLICABLE_CURRENT_RELEASE",
      DEPLOYER: "FUTURE_TRIGGER_ONLY",
      HIGH_RISK_PROVIDER: "NOT_APPLICABLE_CURRENT_RELEASE",
      CONFORMITY: "FUTURE_TRIGGER_ONLY",
      GPAI: "NOT_APPLICABLE_CURRENT_RELEASE",
    };

    expect(authority).toContain("canonical current legal-control register");
    for (const [workstream, disposition] of Object.entries(dispositions)) {
      expect(authority).toContain("| " + workstream + " | " + disposition);
    }

    expect(authority).toContain("entity lane is intentionally deferred");
    expect(predecessor).toContain("SUPERSEDED_BY_CURRENT_LEGAL_AUTHORITY_MATRIX");
  });

  it("keeps factual legal blockers separate from optional assurance", () => {
    expect(scorecard).toContain("LEGAL_LAUNCH_100=NO_PASS");
    expect(scorecard).toContain("MASTER_LEGAL_OPINION_STATUS | OPTIONAL_ENTERPRISE_ASSURANCE_OPEN");
    expect(scorecard).toContain("Article 28 DPA");
    expect(scorecard).toContain("Entity and tax facts");
    expect(scorecard).toContain("Provider, subprocessor and international-transfer facts");
    expect(scorecard).toContain("No paid lawyer is intrinsically required");
  });
});
