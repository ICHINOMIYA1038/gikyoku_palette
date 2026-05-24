import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // any の濫用を防ぐ。やむを得ない箇所は `// eslint-disable-next-line @typescript-eslint/no-explicit-any` で明示。
      "@typescript-eslint/no-explicit-any": "warn",
      // 未使用変数。`_` で始まる引数は許容（捨てる用途）。
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // ServerAction で握りつぶす catch があるので no-empty は緩める
      "no-empty": ["warn", { allowEmptyCatch: true }],
      // 開発中の console を残しがちなので warn のみ。log は止めて warn/error は許容。
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // React Compiler の cascading-render / use-before-declare は警告のみ
      // （editor 周辺の既存実装で多数発生しているため。リファクタ後に error 化を検討）
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  // Editor 周辺は Block 判別共用体の局所変更パターンで as any が多発する。
  // 別途 reducer 型に整理予定なので、ここではまとめて warn に下げる。
  {
    files: ["src/components/editor/**/*.tsx", "src/lib/editor/**/*.ts"],
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // any は editor 内に集中。型リファクタとセットで段階的に減らす。
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // 生成物・スクリプト・seed は緩める
  {
    files: ["scripts/**/*", "prisma/seed*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ローカルワークツリー
    ".worktrees/**",
    // ベンダ済み worker
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
