"use client";
// Libraries
import React from "react";
// State
import store from "@/store/store";
// Components
import App from "@/src/components/App";
import { Provider } from "react-redux";
import { GameErrorBoundary, NavigationBar } from "@/src/components/General";
import { exposeStoreForE2e } from "@/src/utils/exposeStoreForE2e";

// Guarded here so the bundler can drop the call and its string from production builds.
if (process.env.NEXT_PUBLIC_E2E === "1") exposeStoreForE2e(store);

export default function Home(): JSX.Element {
  return (
    <Provider store={store}>
      <GameErrorBoundary>
        <NavigationBar />
        <App />
      </GameErrorBoundary>
    </Provider>
  );
}
