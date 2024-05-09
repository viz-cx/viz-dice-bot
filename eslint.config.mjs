import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import babelParser from "@babel/eslint-parser";

export default [
  {
    languageOptions: {
      parser: babelParser,
      globals: globals.browser,
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
