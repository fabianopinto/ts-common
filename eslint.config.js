// ESLint v9 flat config
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
  // Global ignores (replacement for .eslintignore)
  {
    ignores: [
      "node_modules",
      "dist",
      "**/*.d.ts",
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.test.ts",
      "**/*.config.ts",
    ],
  },

  // TypeScript + Prettier configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Automatically detect the closest tsconfig for each file
        project: true,
        // Ensure this is a filesystem path, not a URL
        tsconfigRootDir: import.meta.dirname,
        // Required when specifying multiple projects with globs
        projectService: true,
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // Rough equivalents to previous extends:
      // eslint:recommended, @typescript-eslint recommended + type-checking, prettier
      "@typescript-eslint/adjacent-overload-signatures": "error",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/consistent-type-assertions": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",

      // Project-specific rules migrated from .eslintrc.cjs
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "prettier/prettier": "warn",

      // Organize imports/exports deterministically
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
    },
  },
];
