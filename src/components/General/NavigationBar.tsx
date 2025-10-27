"use client";
import { Button, Dialog, UserAuthentication } from "@/src/components";
import { useState } from "react";

export const NavigationBar = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const handleLogin = () => {
    setIsLoginDialogOpen(true);
  };
  return (
    <>
      <div className="w-full flex flex-row justify-between items-center bg-primary">
        <Button
          onClick={handleLogin}
          backgroundColor="bg-blue-500"
          text="Login"
        />
      </div>
      <Dialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        backgroundColor="#FFF"
      >
        <UserAuthentication />
      </Dialog>
    </>
  );
};
