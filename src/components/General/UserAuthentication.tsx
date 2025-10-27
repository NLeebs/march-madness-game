"use client";
import {
  LoginForm,
  SignupForm,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components";

//https://www.youtube.com/watch?v=6XGvBBDtRfo @ 18:30
//TODO: Make password confirmation work
//TODO: Spam validation for signup form
export const UserAuthentication = () => {
  return (
    <Tabs
      className="flex flex-col items-center justify-center"
      defaultValue="login"
    >
      <TabsList>
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Signup</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
      <TabsContent value="signup">
        <SignupForm />
      </TabsContent>
    </Tabs>
  );
};
