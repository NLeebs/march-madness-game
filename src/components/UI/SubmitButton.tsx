"use client";
import { Button } from "@/src/components/UI/Button";
import { useSpamProtectionContext } from "@/src/components/Context";
import { PRIMARY_COLOR } from "@/src/constants";

interface SubmitButtonProps {
  text: string;
  submittingText: string;
  backgroundColor?: string;
  disabled?: boolean;
}

export const SubmitButton = ({
  text,
  submittingText,
  backgroundColor = PRIMARY_COLOR,
  disabled = false,
}: SubmitButtonProps) => {
  const { isSubmitting, isRateLimited } = useSpamProtectionContext();

  return (
    <Button
      type="submit"
      text={isSubmitting ? submittingText : text}
      backgroundColor={backgroundColor}
      disabled={disabled || isSubmitting || isRateLimited}
    />
  );
};
