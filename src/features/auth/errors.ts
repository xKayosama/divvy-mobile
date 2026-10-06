export function errorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;
}
export function authError(error: unknown, fallback: string) {
  const status = errorStatus(error);
  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR")
    return "Could not reach the server. Check your connection and try again.";
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    )
      return data.message;
  }
  return fallback;
}
