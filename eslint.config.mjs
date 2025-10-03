import js from "@eslint/js";
import globals from "globals";
import pluginImport from "eslint-plugin-import";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    ignores: [
      "node_modules/**",
      "venv/**"
    ],
    plugins: { js, import: pluginImport },
    extends: ["js/recommended"],
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
      "no-magic-numbers": "off",
      "no-empty-function": "warn",
      "valid-jsdoc": "off",
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
