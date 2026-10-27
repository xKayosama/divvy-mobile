export function validateNames(firstName: string, lastName: string) {
  if (![firstName, lastName].every(value => value.trim().length > 0 && value.length <= 100)) return "Enter first and last names of 1–100 characters.";
  return "";
}
export function validateEmailChange(email: string, password: string) {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid new email address.";
  if (!password) return "Enter your current password.";
  return "";
}
export function validateDeletion(password: string, confirmation: string) {
  if (!password) return "Enter your current password.";
  if (confirmation !== "DELETE") return "Type DELETE to confirm account deletion.";
  return "";
}
