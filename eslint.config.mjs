import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import babelParser from "@babel/eslint-parser";

export default [
  {
    ignores: ["dist/", "*.config.mjs", "*.config.ts"],
  },
  {
    languageOptions: {
      parser: babelParser,
      globals: globals.node,
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylistic,
];
