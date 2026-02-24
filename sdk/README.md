# Pixie SDK

Local SDK server for Pixie AI Evals — manages datasets, renders labeling UI, and proxies to the remote Pixie server.

## Installation

```bash
pip install -e .
```

## Running

```bash
python -m pixie_sdk.server
```

The server will start on port 8100.

## GraphQL API

Access the GraphQL playground at http://localhost:8100/graphql

## REST Endpoints

- `POST /upload` - Upload data files
- `GET /labeling-ui/{entry_id}` - Render labeling UI for a test case
- `GET /health` - Health check
