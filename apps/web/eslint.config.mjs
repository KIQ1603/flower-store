import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "dist-tracker", "node_modules", "public", "*.mjs", "*.cjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, __BUILD_DATE__: "readonly" } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error", // luật bắt buộc: hook chỉ gọi ở cấp cao nhất của component
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "off", // dữ liệu API trả về dùng any ở vài chỗ
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }], // cho phép kiểu cond && fn() đang dùng trong mã
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
