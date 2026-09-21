import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // server/ is a separate CommonJS Node project, not part of the Next app.
    "server/**",
    // Native iOS project; also holds the built web bundle copied by `cap sync`.
    "ios/**",
  ]),
  {
    // React 19 lint rules that flag the "read localStorage after mount" pattern
    // used across the app. Kept as warnings until those effects are reworked
    // deliberately (WKWebView timing makes blind rewrites risky).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
