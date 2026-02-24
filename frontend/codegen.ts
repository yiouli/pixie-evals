import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * GraphQL code generation configuration.
 *
 * Generates TypeScript types and React Apollo hooks from:
 * - Remote pixie-server schema (localhost:8000/graphql)
 * - Local SDK server schema (localhost:8100/graphql)
 */
const config: CodegenConfig = {
  overwrite: true,
  generates: {
    // Remote server types & hooks
    "src/generated/remote/": {
      schema: "http://localhost:8000/graphql",
      documents: "src/graphql/remote/**/*.graphql",
      preset: "client",
      plugins: [],
    },
    // Local SDK server types & hooks
    "src/generated/sdk/": {
      schema: "http://localhost:8100/graphql",
      documents: "src/graphql/sdk/**/*.graphql",
      preset: "client",
      plugins: [],
    },
  },
};

export default config;
