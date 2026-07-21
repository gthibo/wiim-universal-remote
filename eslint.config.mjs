import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // _showa/ is a design-reference mirror, already excluded from
    // TypeScript itself (see tsconfig.json's `exclude`) — same reasoning
    // applies here. next-env.d.ts is Next.js's own auto-generated file.
    ignores: [".next/**", "node_modules/**", "public/**", "_showa/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
