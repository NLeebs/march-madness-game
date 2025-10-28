"use client";
import { useDispatch } from "react-redux";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "@/app/api/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSpamProtection } from "@/src/hooks";
import {
  signupFormSchema,
  signupFormDefaults,
  SignupFormData,
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

export const SignupForm = () => {
  const dispatch = useDispatch();
  const { isSubmitting, isRateLimited } = useSpamProtection();

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: "onBlur",
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
      throw new Error(error.message);
    }
    const { data: updateData, error: updateError } =
      await supabase.auth.updateUser({
        data: {
          display_name: data.userName,
        },
      });
    if (updateError) {
      console.error("Error adding username:", updateError);
      throw new Error(updateError.message);
    }
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
              name="userName"
              label="Username"
              type="text"
              required
            />

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
