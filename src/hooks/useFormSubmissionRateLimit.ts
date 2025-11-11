"use client";
import { useState, useCallback, useRef } from "react";
import {
  RATE_LIMIT_WINDOW,
  MAX_SUBMISSIONS_PER_WINDOW,
} from "@/src/constants/CONSTANTS";

interface FormSubmissionRateLimitState {
  isRateLimited: boolean;
  remainingAttempts: number;
  resetTime: number;
}

export const useFormSubmissionRateLimit = () => {
  const [formSubmissionRateLimitState, setFormSubmissionRateLimitState] =
    useState<FormSubmissionRateLimitState>({
      isRateLimited: false,
      remainingAttempts: MAX_SUBMISSIONS_PER_WINDOW,
      resetTime: 0,
    });

  const submissionTimes = useRef<number[]>([]);

  const checkFormSubmissionRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    submissionTimes.current = submissionTimes.current.filter(
      (time) => time > windowStart
    );

    const currentSubmissions = submissionTimes.current.length;
    const remainingAttempts = Math.max(
      0,
      MAX_SUBMISSIONS_PER_WINDOW - currentSubmissions
    );
    const isRateLimited = currentSubmissions >= MAX_SUBMISSIONS_PER_WINDOW;

    setFormSubmissionRateLimitState({
      isRateLimited,
      remainingAttempts,
      resetTime: isRateLimited ? now + RATE_LIMIT_WINDOW : 0,
    });

    return !isRateLimited;
  }, []);

  const recordFormSubmission = useCallback(() => {
    const now = Date.now();
    submissionTimes.current.push(now);
    checkFormSubmissionRateLimit();
  }, [checkFormSubmissionRateLimit]);

  const resetFormSubmissionRateLimit = useCallback(() => {
    submissionTimes.current = [];
    setFormSubmissionRateLimitState({
      isRateLimited: false,
      remainingAttempts: MAX_SUBMISSIONS_PER_WINDOW,
      resetTime: 0,
    });
  }, []);

  return {
    ...formSubmissionRateLimitState,
    checkFormSubmissionRateLimit,
    recordFormSubmission,
    resetFormSubmissionRateLimit,
  };
};
