export function resetEmailError(email: string): string | undefined {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? undefined
    : "Enter a valid email address.";
}

export function passwordResetErrors(email: string, code: string, password: string, confirmation: string) {
  const errors: Record<string, string> = {};
  const emailError = resetEmailError(email);
  if (emailError) errors.email = emailError;
  if (!/^\d{8}$/.test(code.trim())) errors.code = "Enter the 8-digit code from your email.";
  // Count UTF-8 bytes without depending on TextEncoder availability on native.
  let bytes = 0;
  for (const character of password) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (bytes > 72) errors.password = "Use a password no longer than 72 UTF-8 bytes.";
  if (password !== confirmation) errors.confirmation = "Your passwords do not match.";
  return errors;
}
