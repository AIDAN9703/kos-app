import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * eslint-config-next v16 ships native flat configs — importing them directly
 * replaces the old FlatCompat wrapper, which crashed ESLint 9 with a
 * circular-structure error.
 */
/**
 * The data layer boundary. Pages, routes, actions and components read and
 * change data through a *.data.ts file, which checks who's asking; only data
 * files and services may use a service, and only services may use the
 * database client.
 */
const databaseClient = {
  name: "@/database/db",
  message: "Only services (*.service.ts, services/) may use the database client.",
};
const servicesOnlyForData = {
  group: [
    "@/features/**/*.service",
    "@/features/**/services/*",
    // The marketing site's "services" pages are UI, not data services.
    "!@/features/_marketing/**",
    "@/shared/lib/services/stripe.service",
  ],
  message: "Use a *.data.ts file — it checks who's asking. Only data files and services may use services.",
};

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      // `const { omitted, ...rest } = obj` is the idiomatic way to drop keys;
      // an underscore prefix marks a deliberately unused binding.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    // Services may use the database; Better Auth's config is infrastructure
    // (its hooks call services); migrations live under database/.
    ignores: [
      "features/**/*.data.ts",
      "features/**/*.service.ts",
      "features/bookings/services/**",
      "features/availability/services/**",
      "shared/lib/services/**",
      "shared/lib/auth/auth.ts",
      "database/**",
    ],
    rules: {
      "no-restricted-imports": ["error", { paths: [databaseClient], patterns: [servicesOnlyForData] }],
    },
  },
  {
    // Data files call services, never the database directly.
    files: ["features/**/*.data.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [databaseClient] }],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "public/**"],
  },
];

export default eslintConfig;
