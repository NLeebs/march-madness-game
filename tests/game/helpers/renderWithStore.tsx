import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import type { AnyAction, Middleware } from "@reduxjs/toolkit";
import type { AppStore } from "@/store/store";

/**
 * Middleware that records every dispatched action. Tests read dispatch order
 * and game results from it (spying on ESM barrel exports does not intercept
 * the components' imports).
 */
export function recordActions(): {
  middleware: Middleware;
  actions: AnyAction[];
} {
  const actions: AnyAction[] = [];
  const middleware: Middleware = () => (next) => (action) => {
    actions.push(action as AnyAction);
    return next(action);
  };
  return { middleware, actions };
}

export function renderWithStore(ui: React.ReactElement, store: AppStore) {
  return render(<Provider store={store}>{ui}</Provider>);
}
