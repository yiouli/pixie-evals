### Optimization stats refresh on manual labeling

- Fixed an issue where the "Optimize Evaluator" button would not reflect newly
  added manual labels until the page was reloaded. The component now explicitly
  refetches the `getOptimizationLabelStats` query whenever a manual label is
  submitted through the dialog.
- Added test for `TestSuiteView` ensuring the refetch occurs and the button
  enables/disables correctly when the underlying stats change.
- Updated `TestSuiteView.tsx` to keep a reference to the `refetch` function from
  the label stats query and invoke it after saving labels.
