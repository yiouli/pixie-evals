Your task is to implement the evaluator optimization feature.

The implemention span across 2 repos:
- pixie-server: the remote server stores manual labeling data as well as the optimized evaluators.

- pixie-evals: the SDK server has access to the raw test case data and the optimization process would run on the sdk server. The frontend would have UX for user to trigger the optimization process.


# pixie-server


A new endpoint similar to `getTestCasesWithLabel` needs to be added, to fetch test cases that has manual labels (labeler is not null) for a test suite AFTER latest evaluator optimization's training data cutoff time for the test suite. These test cases would be turned into example for DSPy optimization.

the `createEvaluator` also need to be modified. The mutation should only take the file upload (json file of dspy optimized program), a datetime reflecting the cutoff date of the training examples, and optional metadata JSON object. Iternally the handler would assign a new evaluator file name (test suite name + date combination), serialize the metadata as part of the evaluator description, and manage the supabase file upload & path tracking internally. The endpoint would simply return the evaluator id to client.

In the database the training cutoff timestamp column should be added to evaluator.

Also add another query endpoint to get the number of manual labeled test cases before & after the latest optimization cutoff date, given a test suite id.

# pixie-evals backend

The optimization process should be implemented as a graphql subscription. It should first fatch the training test cases from the new endpoint, then it should load the raw test case data from local db and turn them into examples. It should then load the latest evaluator using `getEvaluatorWithSignature` (extract the evaluator creation logic in the evaluate subscription into helper and re-use it), and it should then run the GEPA optimization on the module. It should send status updates of the optimization to the client. Once evaluation completes it should save the evaluator to remote serve.


# pixie-evals frontend

the frontend should have a button in the evaluation (test suite) view to trigger the optimization process. The button should be enabled when there are
more than max(5, 0.2 * manual labeled count before cutoff) manual labeled test cases AFTER latest optimiztion cutoff.

The button should trigger the optimization process and have a dialog to show the progress, in similar fashion of the current evaluate dialog in datasetview.
