# Overview

This is a mono-repo for AI evals containing a lightweight python SDK, and a web application is for managing AI Evals test suites, as well as manually labeling test cases.

the python SDK manages a simple sqlite database that stores raw test case content with ids, and a server that provides functionalities to embed, evaluate and renders the displaying UI of the test cases, as well as to optimize evaluator on a set of labeled test cases.

sparately there's a remote graphql server (you can inspect its schema at localhost:8000/graphql) that contains more complicated funtionalities for managing test suites. The SDK server lives separately because it'd be running locally on user's machine to make sure the raw test case data (privacy sensitive) would never leave their local machine.

the web frontend would provide the UI to manage test suites via interaction with both the sdk server and remote server.

# Frontend

## Tech stack

- pnpm
- graphql-codegen
  - server: localhost:8000/graphql
- Vite + React
- Apollo Client
- react router
- Zustand
- MUI
- codemirror

## file structure

- frontend
  - components
  - generated
  - graphql
  - hooks
  - lib
  - index.ts
  - codegen.ts

# SDK

## Tech stack

- uv: dependency management
- sqlite: dataset storage
- jinja2: labeling display ui rendering
- polars + magic + pyarrow.dataset + genson: processing uploaded file into dataset
- ariadne-codegen: generate client code for calling remote server
- fastapi + strawberry graphql: serving web application
- uvicorn: running sdk server


## Storage table

- datasets
  - id
  - file_name
  - createdAt
  - row_schema (JSON)
- dataEntries
  - id
  - data (JSON)
  - fk dataset

## file structure

- sdk
  - server.py: fastapi server & run server entry point
  - db.py: database operations
  - graphql.py: strawberry graphql schema definition

# User Scenarios

Here are the user scenarios that the UI should support


## Login/logout



## Create a Test Suite

1. The user would select a dataset file (json, csv, ...) to upload.
The frontend would upload the file to the SDK server, the server would load it into a dataset (list[dict]), and infer its row schema. example code:
```
import magic
import json, csv
import pyarrow.dataset as ds
import polars as pl

def load_to_rows(path: str) -> list[dict]:
    mime = magic.from_file(path, mime=True)

    if "json" in mime or path.endswith((".json", ".jsonl")):
        with open(path) as f:
            content = f.read().strip()
            if content.startswith("["):
                return json.loads(content)
            else:  # JSONL
                return [json.loads(line) for line in content.splitlines() if line]

    elif path.endswith(".parquet"):
        return pl.read_parquet(path).to_dicts()

    elif path.endswith(".csv"):
        return pl.read_csv(path).to_dicts()

    # fallback: try HuggingFace datasets
    from datasets import load_dataset
    return list(load_dataset(path)["train"])

from genson import SchemaBuilder

def infer_schema(rows: list[dict]) -> dict:
    builder = SchemaBuilder()
    for row in rows:
        builder.add_object(row)
    return builder.to_schema()
```
2. the SDK server then assign a uuid for each row and store the dataset in sqlite. It then returns the created dataset object to web UX.

3. The frontend ux would automatically navigate to a test suite creation view.
The creation view essentially is to gather all the remaining information needed to call `create_test_suite` followed by `add_test_cases` on the remote server from the SDK server, including:
 - test suite name - use the file name as placeholder/default
 - description (optional)
 - metrics - should have a list with a select from existing metrics, and an "create" button to open a metric creation modal. The modal would gather necesary information and call `create_metric` on remote server.
 - config(input_schema): default to use the row schema for the dataset; should have a button for using a data adaptor. for now let's leave the data adaptor related features To-be-implemented and having the button being no-op.

4. after user configure the information and click a button to create test suite, the web ui should create a graphql subscription to the sdk server, and the in subscription, the sdk server should send status updates to client while do the following steps:
 - call `create_test_suite` on remote server
 - after creation, start embedding the test cases (stringify each row as a json object) in batches with openai text embedding, then call `add_test_cases` for each batch with embedding.

5. after the processing completed, show a dialog summarizing the status, with buttons to back to test suite configuration view, or go to "evaluation" view


## Evaluate test suite

There are several closely related sub-scenarios when user wants to evaluate a test suite:
- manually evaluate (labeling) of some test cases
- Train (optimize) an evaluator based on some labeled test cases
- using a evaluator to automatically evaluate some/all test cases
- examine the evaluation results, in summary and/or in detail

All of these sub-scenarios should be supported by the "evaluation" view.

The Evaluation View should show the test suite title, followed by action buttons.

The action buttons are: manual review, train evaluator, and run evaluation.

The manual review button should open the labeling UI in a modal. It would show the display UI for a test case (for now just pick the first non-human labeled test case) in a iframe. The display UI would be rendered with jinja on the sdk server. The dialog should also include the UX for labeling - assigning value for each metrics, and a text input for optional notes.

For train evaluator & run evaluation, let's make then no-op for now and we'll implement later.

Then after the buttons, it should show key metrics of the latest evaluation result.

Then after that it should show the paginated datagrid of all the test cases, with their labels and action buttons (delete/label/run evaluator)
