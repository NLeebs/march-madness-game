"use client";
import React from "react";
import { NavigationBar } from "@/src/components/General/NavigationBar";

const DashboardPage = () => {
  return (
    <>
      <NavigationBar />
      <div className="flex items-center justify-center min-w-full min-h-screen">
        <h1>Hello Dashboard</h1>
      </div>
    </>
  );
};

export default DashboardPage;
