import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * eslint-config-next v16 ships native flat configs — importing them directly
 * replaces the old FlatCompat wrapper, which crashed ESLint 9 with a
 * circular-structure error.
 */
/** Query layers that only the data layer may import. */
const dataLayerPaths = [
  {
    name: "@/features/boats/boat.service",
    message: "Use @/features/boats/boat.data — it checks who's asking.",
  },
];
const dataLayerPatterns = [
  {
    group: ["@/features/bookings/services/*"],
    message:
      "Use the bookings data layer (deal.data, deal-money.data, proposal.data, booking-request.data) — it checks who's asking.",
  },
];

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
    // Data layer boundary: pages, routes, actions and components read and
    // change data through a *.data.ts file, which checks who's asking. Only
    // data files and other services may use the query layer below them.
    // Areas are added here as they move onto the data layer.
    files: ["**/*.{ts,tsx}"],
    ignores: ["features/**/*.data.ts", "features/**/*.service.ts", "features/**/services/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: dataLayerPaths, patterns: dataLayerPatterns }],
    },
  },
  {
    // Not on the data layer yet — remove each file as its area moves over.
    files: [
      "app/api/webhook/stripe/route.ts",
      "app/api/stripe/verify/route.ts",
      "app/api/inbound-email/route.ts",
      "features/profile/actions/trip.actions.ts",
      "features/bookings/lib/confirm-paid-booking.ts",
      "features/users/claim-guest-bookings.ts",
      "features/admin/dashboard.ts",
      "features/admin/assistant/tools.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", { paths: dataLayerPaths }],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "public/**"],
  },
];

export default eslintConfig;
