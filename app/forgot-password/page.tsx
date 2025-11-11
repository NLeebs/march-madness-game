"use client";
import React from "react";
import { NavigationBar, NewPasswordRequestForm } from "@/src/components";

const ForgotPasswordPage = () => {
  return (
    <>
      <NavigationBar />
      <div className="flex items-center justify-center min-w-full min-h-screen">
        <NewPasswordRequestForm />
      </div>
    </>
  );
};

export default ForgotPasswordPage;
