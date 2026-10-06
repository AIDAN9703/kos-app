import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * eslint-config-next v16 ships native flat configs — importing them directly
 * replaces the old FlatCompat wrapper, which crashed ESLint 9 with a
 * circular-structure error.
 */
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/features/boats/boat.service",
              message: "Use @/features/boats/boat.data — it checks who's asking.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "public/**"],
  },
];

export default eslintConfig;
