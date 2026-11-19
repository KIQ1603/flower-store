import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "prisma/migrations", "*.mjs", "*.cjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts", "prisma/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Prisma/JSON và test dùng any ở nhiều chỗ
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }], // cho phép kiểu cond && fn() đang dùng trong mã
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-escape": "warn",
    },
  },
);
