Here are the specifics for the frontend implementation

# Views

## Landing view

The frontend by default should land on the selection view. It should closely assemble the SelectionScreen.tsx in pixie-ui, with the collections being the test suites and the datasets.

A change needs to be made to the "add ..." button in the implementation - instead of showing instructions, the landing view should instead open dialogs for upload dataset/test suite configuration

## Dataset View

Dataset name as header (click to edit), action buttons bar (create test suite, delete), description (click to edit), readonly json schema extracted from the dataset, and a paginated data grid showing the dataset content.

## Test Suite View

Test suite name as header (click to edit), evaluation metrics, action buttons bar (manual label, ai evaluate, import test cases, delete), description (click to edit), list of metrics (readonly), readonly input schema, paginated test cases with action buttons column (label, eval, delete).

# Modals

## Sign-in modal

The sign-in modal should be showing whenever the user is not logged in. The login happens with the remote graphql server (by getting auth token). the obtained token should be stored security in browser, and used to determine whether user is logged in or not.

## Dataset upload Dialog

Simple upload dialog, drap-or-drop, or click to upload. accept json, tsv, or csv files.

## Test Suite Configuration Dialog

in similar style of test suite view, but fields being editable:
- test suite name
- description (optional)
- metrics (editable list)
- dataset selection (or upload)

the input schema & paginated test cases (without action buttons column) would be displaying (readonly) once a dataset is selected.


## Manual labeling dialog

render the next recommended candidate to label (there would be a graphql query endpoint for this on the remote server in future), use the sdk server's endpoint to render labeling UI, and put that in an iframe, then at the bottom there should be one rating UI per metric, an input field for optional notes, and a button group (save, skip)


## evaluation dialog
This should show a updating statics for each metrics and a linearing progress bar. Also have a button to cancel. For now we don't have the server endpoint to actually run the ai evaluations, so just show the dialog without the data/progress updates for now.


# UX transitions

Landing on Selection

Click add dataset/test suite => open dataset upload/
