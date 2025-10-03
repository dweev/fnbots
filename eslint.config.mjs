// ─── Info ──────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info eslint.config.mjs ────────────────

import js from "@eslint/js";
import globals from "globals";
import pluginImport from "eslint-plugin-import";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    ignores: [
      "node_modules/**",
      "venv/**",
      "eslint.config.{js,mjs}"
    ],
    plugins: { import: pluginImport },
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-empty-function": "warn",
      "no-console": "off",
      "prefer-const": "warn",
      "no-const-assign": "error",
      "no-redeclare": "error",
      "eqeqeq": ["error", "always"],
      "semi": ["error", "always"],
      "import/no-unresolved": "error",
      "import/no-absolute-path": "error",
    },
  },
]);
