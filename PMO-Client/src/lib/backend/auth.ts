import axios from "axios";
import {
  backendEnabled,
  clearBackendSession,
  getBackendToken,
  setBackendToken,
} from "@/lib/backend/session";

/**
 * Sign-in bridge while screens move from the legacy API to the new backend.
 *
 * The sign-in form signs in to the legacy API (which still decides whether
 * sign-in succeeded) and then to the new backend with the same email and
 * password. Accounts are migrated with their password hashes, so the same
 * credentials work on both. A failure here does not block sign-in: screens on
 * the legacy API keep working, and screens on the new backend send the user
 * back to sign-in.
 */
export async function signInToBackend(email: string, password: string): Promise<boolean> {
  clearBackendSession();
  if (!backendEnabled) return false;
  try {
    const response = await axios.post<{ accessToken?: string }>("/backend/auth/login", {
      email,
      password,
    });
    if (!response.data?.accessToken) return false;
    setBackendToken(response.data.accessToken);
    return true;
  } catch (error) {
    console.warn("Sign-in to the new backend failed; only legacy screens will work.", error);
    return false;
  }
}

/** Ends the session on the new backend. Never throws. */
export async function signOutOfBackend(): Promise<void> {
  const token = getBackendToken();
  clearBackendSession();
  if (!backendEnabled || !token) return;
  try {
    await axios.post("/backend/auth/logout", null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // The token is gone locally; it expires on its own.
  }
}
