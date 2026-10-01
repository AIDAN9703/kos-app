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
    ignores: [".next/**", "node_modules/**", "public/**"],
  },
];

export default eslintConfig;
