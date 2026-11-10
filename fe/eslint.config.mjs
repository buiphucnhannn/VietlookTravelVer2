import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Bắt lỗi dùng biến / hàm chưa khai báo (vd. đổi tên hàm nhưng còn sót chỗ gọi)
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "no-undef": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
