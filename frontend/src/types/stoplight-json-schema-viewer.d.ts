/**
 * Type declarations for @stoplight/json-schema-viewer.
 *
 * The library ships index.d.ts at the package root, but its package.json
 * "exports" field does not include a "types" condition, so
 * moduleResolution:"bundler" cannot resolve the types automatically.
 * This ambient declaration re-exports them.
 */
declare module "@stoplight/json-schema-viewer" {
  export {
    JsonSchemaViewer,
    Choice,
    useChoices,
    Validations,
  } from "@stoplight/json-schema-viewer/components";
  export { visibleChildren } from "@stoplight/json-schema-viewer/tree";
  export * from "@stoplight/json-schema-viewer/types";
}
