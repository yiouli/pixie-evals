Your task is to implement the features around data adaptors.

# Context

In the system, a test suite (or evaluation) takes specific formatted input data. A data adaptor is needed when we want to add test cases to the test suite, while the test case format is different from the required input data format of the test suite. The data structure and operations for data adaptor is already defined in pixie-server (see the overview.md)

What you need to implement is to properly add the data adapter operations to the pixie-evals frontend.

# User Scenarios

Here are the UX scenarios that needs to be implemented.

## configuring input schema when creating test suite

Currently in frontend, creating a new test suite (evaluation) requires selecting a dataset, and the test suite's input schema would be set to the row schema of the dataset. We need to add the ability to add the optional data adoptor in this process, so on creation, the test suite's input schema would be the transformed schema instead of dataset row schema, and the rows from the dataset would be added to the test suite as test cases with the data adaptor.

## select data adaptor when choosing test suite for dataset

In dataset view, user can choose the test suite (evaluation) for a dataset in dataset view. However, that currently doesn't consider if the dataset row schema and the test suite's input schema is incompatible.

The ability to detect the schema incompatibility, and require user to select (or create) a fitting data adaptor. The selectable candidates can be lookeedup by getting all the data adaptor associated with the selected evaluation, then checking the compatibility of the adaptor's input schema.

## transform data when running evaluation

when running the evaluation on a dataset, the data transformation defined by the adoptor should be applied to the raw data set rows before it got turned into dspy evalutor input. `get_test_cases_with_label` endpoint on remote server should provide the data adoptor <-> test case (dataset row) association.

# implementation details

## adaptor definition

A adaptor is defined with a name, optional description, association with test suite, input JSON schema, and a list of transformation rules.
The data transformation rules are defined as a list of JSONPath + optional name override + optional description override. the list represents the places where the data should be looked up in the original input, and how they should be placed in the output of data adaptor. e.g.:

input schema:
{..., properties: {a: ..., b: {..., properties: {b1: ..., b2:...}}}}

input object:
{a: 1, b: {b1: "b1", b2: false}}
adaptor:
[{path: '$.a'}, {path: '$.b.b1', name: 'c', description: '...'}]

output schema:
{...properties: {a: ..., c:....}}

output object:
{a:1, c: "b1"}

In both scenarios above, the input schema for the data adoptor would be the row schema for the dataset.
The name should be prefilled with "from <dataset name>".
The UX for the adoptor rules should be an editable list. For each "rule", it should have an autocomplete for the JSONpath (options should be generated from the adaptors input schema, which would be the dataset row schema for both scenarios above). Once a valid JSONpath is entered, the list item UX should then render the sub schema for the path, and have the input field for name and description, both prefilled with name & description for the selected sub schema. The name input cannot be set to empty.

## Saving adaptor

When saving the data adaptor with remote server's mutation endpoints, we also want to store the association of dataset <-> adaptor. we should do that by adding an additional metadata field (dict[str, any]) to the DataAdaptorConfig, and save the dataset_id in the metadata on creation.

this should also enable the auto-select of data adaptor in dataset view: When there's already an adaptor for the selected test suite & the current dataset, that adaptor should be automatically selected.
