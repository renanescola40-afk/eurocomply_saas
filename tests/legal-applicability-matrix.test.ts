import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..");
const matrix = readFileSync(
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
    expect(inventory).toContain("NO_MODEL_RUNTIME_EVIDENCED");
    expect(inventory).toContain("NO_AI_SYSTEM_IDENTIFIED_FOR_CURRENT_ACCEPTED_RISCK_RUNTIME");
    expect(inventory).toContain("Current Production and source inspection found no model invocation");
  });

  it("closes the historical eight workstreams by applicability, not by invented signatures", () => {
    const workstreams = [
      "LEGAL_RULES",
      "ARTICLE_5",
      "ARTICLE_50",
      "FRIA",
      "DEPLOYER",
      "HIGH_RISK_PROVIDER",
      "CONFORMITY",
      "GPAI",
    ];

    for (const workstream of workstreams) {
      expect(matrix).toContain("| " + workstream + " | NOT_APPLICABLE_CURRENT_RELEASE |");
    }

    expect(matrix).toContain("LEGAL_REQUIREMENTS_8_OF_8_OR_NA=8/8");
    expect(matrix).toContain("LEGAL_8_OF_8_HUMAN_REVIEWS=0/8");
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
