"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "@/infrastructure/db/supabaseClient";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  newPasswordRequestFormSchema,
  newPasswordRequestFormDefaults,
  NewPasswordRequestFormData,
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

export const NewPasswordRequestForm = () => {
  const router = useRouter();

  const newPasswordRequestForm = useForm<NewPasswordRequestFormData>({
    resolver: zodResolver(newPasswordRequestFormSchema),
    mode: "onBlur",
    defaultValues: newPasswordRequestFormDefaults,
  });

  const handleNewPasswordRequest: SubmitHandler<
    NewPasswordRequestFormData
  > = async (data) => {
    const { data: newPasswordRequestData, error } =
      await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/password-recovery`,
      });
    if (error) {
      console.error("Error new password requesting:", error);
      throw new Error(error.message);
    }
    router.push("/");
  };

  const { control } = newPasswordRequestForm;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Request New Password</CardTitle>
          <CardDescription>
            If you have an account with us, we&apos;ll send you an email to
            reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtectedForm control={control} onSubmit={handleNewPasswordRequest}>
            <FormField
              control={control}
              name="email"
              label="Email"
              type="email"
              required
            />

            <div className="pt-4 w-full flex justify-center">
              <SubmitButton
                text="Request New Password"
                submittingText="Requesting New Password..."
              />
            </div>
          </ProtectedForm>
        </CardContent>
      </Card>
    </div>
  );
};
