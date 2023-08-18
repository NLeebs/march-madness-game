"use client"
// Libraries
import React from "react";
// State
import store from "@/store/store";
// Components
import App from "@/src/components/App.js";
import { Provider } from "react-redux";


export default function Home() {
  
  return (
    <Provider store={store} >
      <App />
    </Provider>
    );
}
