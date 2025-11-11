"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "@/app/api/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSpamProtection } from "@/src/hooks";
import {
  loginFormSchema,
  loginFormDefaults,
  LoginFormData,
} from "@/src/formSchemas";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  FormField,
  ProtectedForm,
} from "@/src/components";
import Link from "next/link";

export const LoginForm = () => {
  const { isSubmitting, isRateLimited } = useSpamProtection();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur",
    defaultValues: loginFormDefaults,
  });

  const handleLogin: SubmitHandler<LoginFormData> = async (data) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      console.error("Error logging in:", error);
      throw new Error(error.message);
    }
    console.log("You're Logged In! 🎉");
  };

  const { control } = loginForm;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your email and password to login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtectedForm control={control} onSubmit={handleLogin}>
            <FormField
              control={control}
              name="email"
              label="Email"
              type="email"
              required
            />

            <FormField
              control={control}
              name="password"
              label="Password"
              type="password"
              required
            />

            <Link href="/forgot-password">Forgot Password?</Link>

            <div className="pt-4 w-full flex justify-center">
              <Button
                type="submit"
                text={isSubmitting ? "Logging In..." : "Login"}
                backgroundColor="#000"
                disabled={isSubmitting || isRateLimited}
              />
            </div>
          </ProtectedForm>
        </CardContent>
      </Card>
    </div>
  );
};
