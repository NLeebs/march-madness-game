"use client";
import { ReactNode, useEffect } from "react";
import {
  Control,
  FieldValues,
  SubmitHandler,
  FieldPath,
} from "react-hook-form";
import { HoneypotInput, FormErrorDisplay } from "@/src/components";
import { useSpamProtection } from "@/src/hooks";
import { HONEYPOT_FIELD_NAME } from "@/src/constants/CONSTANTS";

interface ProtectedFormProps<T extends FieldValues> {
  control: Control<T>;
  onSubmit: SubmitHandler<T>;
  children: ReactNode;
  className?: string;
}

/**
 * ProtectedForm wrapper component that handles all spam protection logic
 * Reduces cognitive load by encapsulating spam protection in a reusable wrapper
 */
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

  // Start form timing when component mounts
  useEffect(() => {
    startFormFillTimeValidation();
  }, [startFormFillTimeValidation]);

  const handleSubmit = async (data: T) => {
    startSubmission();

    try {
      // Validate submission with all spam protection layers
      const validation = await validateSubmission(data);

      if (!validation.isValid) {
        setError(validation.error || "Validation failed");
        return;
      }

      // Call the actual form submission handler
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      setError("An error occurred during submission. Please try again.");
    } finally {
      endSubmission();
    }
  };

  return (
    <form
      className={`flex flex-col gap-4 ${className}`}
      onSubmit={control.handleSubmit(handleSubmit)}
    >
      {/* Honeypot field - automatically included */}
      <HoneypotInput
        control={control}
        name={HONEYPOT_FIELD_NAME as FieldPath<T>}
      />

      {/* Form content */}
      {children}

      {/* Error displays */}
      <FormErrorDisplay error={submitError} type="error" />
      <FormErrorDisplay
        error={
          isRateLimited
            ? "Rate limit exceeded. Please wait before submitting again."
            : undefined
        }
        type="warning"
      />
    </form>
  );
};
