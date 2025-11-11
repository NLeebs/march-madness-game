"use client";
import { useState, useCallback } from "react";
import {
  useFormSubmissionRateLimit,
  useFormFillTimeValidation,
} from "@/src/hooks";
import { detectSpam, getSpamErrorMessage } from "@/src/utils/spamDetection";

interface SpamProtectionState {
  isSubmitting: boolean;
  submitError: string;
  isRateLimited: boolean;
  remainingAttempts: number;
}

interface SpamProtectionActions {
  validateSubmission: (formData: Record<string, any>) => Promise<{
    isValid: boolean;
    error?: string;
  }>;
  recordSuccessfulSubmission: () => void;
  startSubmission: () => void;
  endSubmission: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  startFormFillTimeValidation: () => void;
}

export const useSpamProtection = (): SpamProtectionState &
  SpamProtectionActions => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const {
    checkFormSubmissionRateLimit,
    recordFormSubmission,
    isRateLimited,
    remainingAttempts,
  } = useFormSubmissionRateLimit();

  const { startFormFillTimeValidation, validateFormFillTime } =
    useFormFillTimeValidation();

  const validateSubmission = useCallback(
    async (formData: Record<string, any>) => {
      if (!checkFormSubmissionRateLimit()) {
        return {
          isValid: false,
          error: `Too many attempts. Please wait before trying again. (${remainingAttempts} attempts remaining)`,
        };
      }

      if (!validateFormFillTime()) {
        return {
          isValid: false,
          error: "Form submitted too quickly or too slowly. Please try again.",
        };
      }

      const spamResult = detectSpam(formData);
      if (spamResult.isSpam) {
        console.warn("Spam detected:", spamResult);
        return {
          isValid: false,
          error: getSpamErrorMessage(spamResult),
        };
      }

      return { isValid: true };
    },
    [checkFormSubmissionRateLimit, validateFormFillTime, remainingAttempts]
  );

  const startSubmission = useCallback(() => {
    setIsSubmitting(true);
    setSubmitError("");
  }, []);

  const endSubmission = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const setError = useCallback((error: string) => {
    setSubmitError(error);
  }, []);

  const clearError = useCallback(() => {
    setSubmitError("");
  }, []);

  const recordSuccessfulSubmission = useCallback(() => {
    recordFormSubmission();
  }, [recordFormSubmission]);

  return {
    isSubmitting,
    submitError,
    isRateLimited,
    remainingAttempts,
    validateSubmission,
    recordSuccessfulSubmission,
    startSubmission,
    endSubmission,
    setError,
    clearError,
    startFormFillTimeValidation,
  };
};
