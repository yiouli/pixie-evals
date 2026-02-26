Your task is to revamp UX components related to metrics.

Here are the involved components:

# metric creation/edit dialog

The dialog should have the metric name as title, a toggle group to select metric type, specialized configuration for each metric type,
optional description, and the cancel/create button at the bottom.

The toggle options and their coresponding configuration input should be:
binary (map to scale with scaling of 1 in backend): no additional configuration
scale: a slider input with the range from 2 - 10
category: an editable text list to configure available categories

When in edit mode (i.e. the metric id exists), only the description is editable, everything else should be readonly.

Whenever after a metric is created successfully, the metrics list should be refetched.

# metrics configuration in "create evaluation" dialog

the metrics editable list should be replaced with an autocomplete withe chips. The auto suggest should also have an option for creating new metric (click to open metric creation dialog).

The chip for metric should have its own component. the chip body should have specific color coding & starting icon for each of the type:
1. category: mui categoryrounded icon
2. binary (scale with scaling of 1): mui checkrounded icon
3. scale (scaling >=2): mui linear scale icon

Hover the chip should should the details in a popover for the metric.


# metric display in evaluation (test suite) view

directly use the list of metric chips without the autocomplete.


# metrics in selection view

metrics should be displayed as the third tab in selection view. click on the "add" button should show the metric creation dialog, while click on the item should show the metric dialog in edit mode.
