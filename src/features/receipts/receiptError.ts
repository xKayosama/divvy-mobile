import { authError, errorStatus } from "@/features/auth/errors";

export function receiptError(error: unknown) {
  if (errorStatus(error) === "TIMEOUT_ERROR")
    return "The receipt scan timed out. Try a clearer photo, or enter the expense manually.";
  if (errorStatus(error) === "FETCH_ERROR")
    return "The receipt photo could not be uploaded. Please retry or choose the photo again.";
  return error instanceof Error
    ? error.message
    : authError(error, "Unable to scan the receipt. Please try again.");
}
