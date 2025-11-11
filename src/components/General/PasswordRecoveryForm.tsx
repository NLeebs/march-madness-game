"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "@/app/api/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  passwordRecoveryFormSchema,
  passwordRecoveryFormDefaults,
  PasswordRecoveryFormData,
} from "@/src/formSchemas";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  FormField,
  ProtectedForm,
  SubmitButton,
} from "@/src/components";

export const PasswordRecoveryForm = () => {
  const router = useRouter();

  const passwordRecoveryForm = useForm<PasswordRecoveryFormData>({
    resolver: zodResolver(passwordRecoveryFormSchema),
    mode: "onBlur",
    defaultValues: passwordRecoveryFormDefaults,
  });

  const handlePasswordRecovery: SubmitHandler<
    PasswordRecoveryFormData
  > = async (data) => {
    const { data: passwordRecoveryData, error } =
      await supabase.auth.updateUser({
        password: data.password,
      });
    if (error) {
      console.error("Error password recovering:", error);
      throw new Error(error.message);
    }
    router.push("/");
  };

  const { control } = passwordRecoveryForm;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password to keep hoppin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtectedForm control={control} onSubmit={handlePasswordRecovery}>
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
              <SubmitButton
                text="Reset Password"
                submittingText="Resetting Password..."
              />
            </div>
          </ProtectedForm>
        </CardContent>
      </Card>
    </div>
  );
};
