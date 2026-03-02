import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { injectStyles } from "@stoplight/mosaic";

import { App } from "./App";
import { remoteClient } from "./lib/apolloClient";
import { theme } from "./lib/theme";

// Inject @stoplight/mosaic utility CSS (required for JsonSchemaViewer styling)
injectStyles();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={remoteClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ApolloProvider>
  </React.StrictMode>,
);
