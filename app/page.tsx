"use client";
// Libraries
import React from "react";
// State
import store from "@/store/store";
// Components
import App from "@/src/components/App";
import { Provider } from "react-redux";
import { NavigationBar } from "@/src/components/General/NavigationBar";

export default function Home(): JSX.Element {
  return (
    <Provider store={store}>
      <NavigationBar />
      <App />
    </Provider>
  );
}
