"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "@/app/api/supabase";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSpamProtection } from "@/src/hooks";
import {
  newPasswordRequestFormSchema,
  newPasswordRequestFormDefaults,
  NewPasswordRequestFormData,
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

export const NewPasswordRequestForm = () => {
  const router = useRouter();

  const { isSubmitting, isRateLimited } = useSpamProtection();

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
              <Button
                type="submit"
                text={
                  isSubmitting
                    ? "Requesting New Password..."
                    : "Request New Password"
                }
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
