"use client";
import {
  LoginForm,
  SignupForm,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components";

interface UserAuthenticationProps {
  openedTab: "login" | "signup";
}

export const UserAuthentication: React.FC<UserAuthenticationProps> = ({
  openedTab = "login",
}) => {
  return (
    <Tabs
      className="flex flex-col items-center justify-center"
      defaultValue={openedTab}
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
