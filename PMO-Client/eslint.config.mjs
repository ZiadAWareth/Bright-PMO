import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Imports the client must never make. The client is a pure frontend: it talks
 * to the backend over HTTP (/api for the legacy app, /backend for the new one),
 * so database and server code have no business in its bundle.
 */
const forbiddenEverywhere = {
  paths: [
    { name: "@prisma/client", message: "The client has no database access. Use the enums in @/types/enums and call the API." },
    { name: "react-hot-toast", message: "Use toast from 'sonner' (the <Toaster /> in the root layout)." },
  ],
  patterns: [
    { group: ["@prisma/*"], message: "The client has no database access. Call the API instead." },
    { group: ["@/legacy-server", "@/legacy-server/*"], message: "Server code lives in PMO-Legacy-API. Call it over /api instead." },
  ],
};

/**
 * Raw palette colours (bg-red-500, text-[#ff0000], …) bypass the theme tokens
 * in globals.css and break dark mode. Use the semantic tokens instead:
 * bg-surface, text-ink, text-muted, border-line, bg-bright, text-danger, …
 */
const PALETTE =
  "(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]{2,3}";
const COLOUR_CLASS = `\\b(bg|text|border|ring|fill|stroke|from|via|to|outline|divide|placeholder|decoration|shadow)-(${PALETTE}|\\[#[0-9a-fA-F]{3,8}\\])`;
const themeTokenRule = [
  "error",
  {
    selector: `Literal[value=/${COLOUR_CLASS}/]`,
    message: "Use theme tokens (bg-surface, text-ink, border-line, bg-bright, text-danger, …) instead of raw palette colours.",
  },
  {
    selector: `TemplateElement[value.raw=/${COLOUR_CLASS}/]`,
    message: "Use theme tokens (bg-surface, text-ink, border-line, bg-bright, text-danger, …) instead of raw palette colours.",
  },
];

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "dist/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Existing debt (~1,300 hits when this config was added). Warnings keep it
    // visible without failing `next build`; fix them as each screen is rewired
    // to the new backend, then promote these back to errors.
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", forbiddenEverywhere],
      "no-restricted-syntax": themeTokenRule,
    },
  },
  {
    // Routes import features and shared code, never the other way round.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...forbiddenEverywhere,
          patterns: [
            ...forbiddenEverywhere.patterns,
            { group: ["@/app/*"], message: "Only routes live in src/app. Move shared code into src/features, src/components or src/lib." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
