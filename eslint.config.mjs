import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint flat config (ESLint 9).
 *
 * `next lint` was deprecated in Next 15 and removed in 16, so the old
 * .eslintrc setup silently stopped running. This restores linting via the
 * standard `eslint .` entry point — see the `lint` script in package.json.
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Regenerated from the live schema; not ours to lint.
      "lib/supabase/database-generated.ts",
    ],
  },

  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    rules: {
      // Unused vars are an error, but allow the `_`-prefix escape hatch for
      // intentionally-ignored destructured values and catch bindings.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Server Actions and Supabase responses are legitimately dynamic in
      // places; `any` still needs justification, so warn rather than error.
      "@typescript-eslint/no-explicit-any": "warn",
      // Enforced by the type checker already; the lint rule mostly fires on
      // valid `<img>` usage for Supabase signed URLs.
      "@next/next/no-img-element": "off",
    },
  },
];
