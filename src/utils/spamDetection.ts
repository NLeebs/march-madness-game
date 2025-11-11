import { SUSPICIOUS_PATTERNS, EMAIL_REGEX } from "@/src/constants/CONSTANTS";

export interface SpamDetectionResult {
  isSpam: boolean;
  reasons: string[];
  score: number;
}

export const detectSuspiciousPatterns = (text: string): string[] => {
  const reasons: string[] = [];

  SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(text)) {
      switch (index) {
        case 0:
          reasons.push("Contains repeated characters (5+ in a row)");
          break;
        case 1:
          reasons.push("Contains repeated character patterns");
          break;
        case 2:
          reasons.push("All characters are identical");
          break;
        case 3:
          reasons.push("Contains 4+ repeated characters");
          break;
      }
    }
  });

  return reasons;
};

export const validateEmail = (
  email: string
): { isValid: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  if (!EMAIL_REGEX.test(email)) {
    reasons.push("Invalid email format");
  }

  const suspiciousReasons = detectSuspiciousPatterns(email);
  reasons.push(...suspiciousReasons);

  return {
    isValid: reasons.length === 0,
    reasons,
  };
};

export const detectSpam = (
  formData: Record<string, any>
): SpamDetectionResult => {
  const reasons: string[] = [];
  let score = 0;

  if (formData.website && formData.website.trim() !== "") {
    reasons.push("Honeypot field was filled");
    score += 100;
  }

  if (formData.email) {
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      reasons.push(...emailValidation.reasons);
      score += emailValidation.reasons.length * 10;
    }
  }

  if (formData.password) {
    const passwordReasons = detectSuspiciousPatterns(formData.password);
    if (passwordReasons.length > 0) {
      reasons.push(...passwordReasons);
      score += passwordReasons.length * 5;
    }
  }

  const spamKeywords = [
    "viagra",
    "casino",
    "lottery",
    "winner",
    "congratulations",
    "click here",
    "free money",
    "urgent",
    "act now",
    "limited time",
  ];

  Object.values(formData).forEach((value) => {
    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      spamKeywords.forEach((keyword) => {
        if (lowerValue.includes(keyword)) {
          reasons.push(`Contains spam keyword: ${keyword}`);
          score += 20;
        }
      });
    }
  });

  if (formData.password) {
    const specialCharCount = (
      formData.password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []
    ).length;
    const totalLength = formData.password.length;
    const specialCharRatio = specialCharCount / totalLength;

    if (specialCharRatio > 0.5) {
      reasons.push("Password contains excessive special characters");
      score += 15;
    }
  }

  return {
    isSpam:
      score >= 50 || reasons.some((reason) => reason.includes("Honeypot")),
    reasons,
    score,
  };
};

export const getSpamErrorMessage = (result: SpamDetectionResult): string => {
  if (result.isSpam) {
    return "Your submission appears to be spam. Please check your input and try again.";
  }
  return "";
};
