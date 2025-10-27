"use client";
import { useState, useCallback, useRef } from "react";
import {
  MIN_FORM_FILL_TIME,
  MAX_FORM_FILL_TIME,
} from "@/src/constants/CONSTANTS";

interface FormFillTimeValidationState {
  isValidFormFillTime: boolean;
  formFillStartTime: number | null;
  timeSpent: number;
}

export const useFormFillTimeValidation = () => {
  const [formFillTimeValidationState, setFormFillTimeValidationState] =
    useState<FormFillTimeValidationState>({
      isValidFormFillTime: false,
      formFillStartTime: null,
      timeSpent: 0,
    });

  const formStartTime = useRef<number | null>(null);

  const startFormFillTimeValidation = useCallback(() => {
    const startTime = Date.now();
    formStartTime.current = startTime;
    setFormFillTimeValidationState((prev) => ({
      ...prev,
      formFillStartTime: startTime,
    }));
  }, []);

  const validateFormFillTime = useCallback((): boolean => {
    if (!formStartTime.current) {
      return false;
    }

    const timeSpent = Date.now() - formStartTime.current;
    const isValidFormFillTime =
      timeSpent >= MIN_FORM_FILL_TIME && timeSpent <= MAX_FORM_FILL_TIME;

    setFormFillTimeValidationState((prev) => ({
      ...prev,
      timeSpent,
      isValidFormFillTime,
    }));

    return isValidFormFillTime;
  }, []);

  const resetFormFillTimeValidation = useCallback(() => {
    formStartTime.current = null;
    setFormFillTimeValidationState({
      isValidFormFillTime: false,
      formFillStartTime: null,
      timeSpent: 0,
    });
  }, []);

  return {
    ...formFillTimeValidationState,
    startFormFillTimeValidation,
    validateFormFillTime,
    resetFormFillTimeValidation,
  };
};
