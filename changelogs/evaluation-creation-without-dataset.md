# Evaluation Creation Without Dataset

## What Changed

The "Create Evaluation" dialog now supports two ways to define the input schema:

1. **From dataset** (existing behaviour): Select an existing dataset (or upload a new one) and optionally configure a data adaptor. The input schema is derived from the dataset's row schema. Test cases are embedded and uploaded via the SDK subscription pipeline.

2. **Configure** (new): Directly enter a JSON Schema object using the built-in JSON schema editor. The evaluation is created immediately via the remote `createTestSuite` mutation — no SDK subscription or embedding pipeline is involved.

The "Dataset" section in the dialog has been renamed to **Input Schema** and contains a tab bar (`From dataset` | `Configure`) that defaults to `From dataset`, preserving backward compatibility.

## Files Affected

| File                                                     | Change                                                                                                                                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/JsonSchemaEditor.tsx`           | New component, adapted from pixie-ui. Wraps `@uiw/react-codemirror` for JSON mode editing with live validation and a Prettify button.                                                                                                          |
| `frontend/src/components/JsonSchemaEditor.test.tsx`      | New test file covering rendering, change callbacks, JSON validation, and Prettify.                                                                                                                                                             |
| `frontend/src/components/TestSuiteConfigDialog.tsx`      | Replaced "Dataset" section with tabbed "Input Schema" section. Added `inputSchemaTab`, `directInputSchema`, `directInputSchemaValid` state. Added `handleCreateDirect` for direct mutation path. Updated disabled logic for the Create button. |
| `frontend/src/components/TestSuiteConfigDialog.test.tsx` | Updated "Input Schema" assertion to `getAllByText` to handle multiple occurrences.                                                                                                                                                             |
| `frontend/package.json`                                  | Added `@uiw/react-codemirror`, `@codemirror/language`, `@codemirror/lint`, `@codemirror/state`, `@lezer/highlight`.                                                                                                                            |

## Migration Notes

No API or schema changes. The existing subscription-based creation flow (`createTestSuiteProgress`) is unchanged. The new "Configure" tab calls the remote `createTestSuite` GraphQL mutation directly, requiring standard auth token in Apollo client headers.
