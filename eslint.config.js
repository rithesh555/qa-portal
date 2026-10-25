import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores([
    "**/dist",
    "**/coverage",
    "**/generated",
    ".agents",
    ".claude",
    "e2e/.web-dist",
    "e2e/results",
    "e2e/.auth",
  ]),
  {
    files: ["**/*.{js,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "apps/api/**/*.ts",
      "packages/**/*.ts",
      "*.js",
      "apps/web/vite.config.ts",
      "e2e/**/*.ts",
    ],
    languageOptions: { globals: globals.node },
  },
  prettier,
])
