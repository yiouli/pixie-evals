# Overview

This is a mono-repo for AI evals containing a lightweight fastapi server, and a web application is for managing AI Evals test suites, as well as manually labeling test cases.

the fastapi server manages a simple sqlite database that stores raw test case content with ids, and renders the displaying UI for labeling the test case.

sparately there's a remote graphql server (you can inspect its schema at localhost:8000/graphql) that contains more complicated funtionalities for managing test suites. The fastapi server lives separately because it'd be running locally on user's machine to make sure the raw test case data (privacy sensitive) would never leave their local machine.

the web frontend would provide the UI to manage test suites.

# Tech stack

- pnpm
- graphql codegen
  - server: localhost:8000/graphql
- Vite + React
- Apollo Client
- react router
- Zustand
- MUI
- codemirror

# file structure

- src
  - components
  - generated
  - graphql
  - hooks
  - lib
  - index.ts
  - codegen.ts

# Views

- landing view
- test-suite selection view
- test-suite configuration view
-

# Modals

- login dialog
- test-cases upload dialog
