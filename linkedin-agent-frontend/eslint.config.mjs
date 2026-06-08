import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Downgrade to warnings — fixing 100+ explicit-any in an existing codebase
      // is a massive refactoring task that should not block CI
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      // Next.js 16 / React 19 strict rule about setState in useEffect
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/no-set-state": "off",
      "react/no-set-state": "off"
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node.js standalone scripts — they legitimately use require()
    "scripts/**",
    "db/**"
  ])
]);

export default eslintConfig;
