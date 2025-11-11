"use client";
import { Button } from "@/src/components/UI/Button";
import { useSpamProtectionContext } from "@/src/components/Context";
import { PRIMARY_COLOR } from "@/src/constants";

interface SubmitButtonProps {
  text: string;
  submittingText: string;
  backgroundColor?: string;
}

export const SubmitButton = ({
  text,
  submittingText,
  backgroundColor = PRIMARY_COLOR,
}: SubmitButtonProps) => {
  const { isSubmitting, isRateLimited } = useSpamProtectionContext();

  return (
    <Button
      type="submit"
      text={isSubmitting ? submittingText : text}
      backgroundColor={backgroundColor}
      disabled={isSubmitting || isRateLimited}
    />
  );
};
