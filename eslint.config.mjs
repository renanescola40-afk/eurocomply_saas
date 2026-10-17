import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "next-env.d.ts",
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "release-validation/**",
      ".vercel/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  // This Node.js test file is intentionally CommonJS because it exercises a
  // CommonJS specialist-routing module. Keep the rule enabled everywhere else.
  {
    files: ["tests/agents/specialist-routing.test.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
