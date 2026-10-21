import axios from "axios";

/**
 * A message for the user from a failed call to the new backend.
 *
 * Nest answers `{ statusCode, message, error }`, where `message` is a string
 * or, for validation errors, a list of strings.
 */
export function backendErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  if (!error.response) return "The server could not be reached. Check your connection and try again.";

  const { status, data } = error.response as {
    status: number;
    data?: { message?: string | string[] };
  };
  if (status === 403) return "You do not have permission to do this.";
  if (status === 404) return "This record no longer exists.";
  if (status >= 500) return fallback;

  const message = data?.message;
  if (Array.isArray(message) && message.length > 0) return message.join(". ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}
