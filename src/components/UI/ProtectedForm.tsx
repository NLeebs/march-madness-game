"use client";
import { ReactNode, useEffect } from "react";
import {
  Control,
  FieldValues,
  SubmitHandler,
  FieldPath,
} from "react-hook-form";
import {
  HoneypotInput,
  FormErrorDisplay,
  LoadingBasketball,
} from "@/src/components";
import { useSpamProtection } from "@/src/hooks";
import { HONEYPOT_FIELD_NAME } from "@/src/constants/CONSTANTS";

interface ProtectedFormProps<T extends FieldValues> {
  control: Control<T>;
  onSubmit: SubmitHandler<T>;
  children: ReactNode;
  className?: string;
}

export const ProtectedForm = <T extends FieldValues>({
  control,
  onSubmit,
  children,
  className = "",
}: ProtectedFormProps<T>) => {
  const {
    isSubmitting,
    submitError,
    isRateLimited,
    validateSubmission,
    startSubmission,
    endSubmission,
    setError,
    startFormFillTimeValidation,
  } = useSpamProtection();

  useEffect(() => {
    startFormFillTimeValidation();
  }, [startFormFillTimeValidation]);

  const handleSubmit = async (data: T) => {
    startSubmission();

    try {
      const validation = await validateSubmission(data);

      if (!validation.isValid) {
        setError(validation.error || "Validation failed");
        return;
      }

      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      setError(error.message);
    } finally {
      endSubmission();
    }
  };

  return (
    <form
      className={`flex flex-col gap-4 ${className}`}
      onSubmit={control.handleSubmit(handleSubmit)}
    >
      <FormErrorDisplay error={submitError} type="error" />
      <FormErrorDisplay
        error={
          isRateLimited
            ? "Rate limit exceeded. Please wait before submitting again."
            : undefined
        }
        type="warning"
      />
      <HoneypotInput
        control={control}
        name={HONEYPOT_FIELD_NAME as FieldPath<T>}
      />

      {isSubmitting ? <LoadingBasketball /> : children}
    </form>
  );
};
