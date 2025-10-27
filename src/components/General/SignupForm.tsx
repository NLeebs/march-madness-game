"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useSpamProtection } from "@/src/hooks";
import {
  signupFormSchema,
  signupFormDefaults,
  SignupFormData,
} from "@/src/formSchemas/signupFormSchema";
import { supabase } from "@/app/api/supabase";

export const SignupForm = () => {
  const { isSubmitting, isRateLimited } = useSpamProtection();

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: "onChange",
    defaultValues: signupFormDefaults,
  });

  const handleSignup: SubmitHandler<SignupFormData> = async (data) => {
    console.log("You're Signed Up! 🎉");
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (error) {
      console.error("Error signing up:", error);
    }
    console.log("User signed up:", signupData);
  };

  const { control } = signupForm;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Signup</CardTitle>
          <CardDescription>
            Enter your email and password to start hoopin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtectedForm control={control} onSubmit={handleSignup}>
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

            <FormField
              control={control}
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              required
            />

            <div className="pt-4 w-full flex justify-center">
              <Button
                type="submit"
                text={isSubmitting ? "Signing up..." : "Signup"}
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
