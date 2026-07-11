"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import axiosInstance from "@/lib/axios";

// Define the types for authentication
type AuthResult = {
  success: boolean;
  token?: string;
  user?: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  error?: string;
};

const useIdpLogin =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_IDP_AUTH === "true";

function loginErrorMessage(code: string): string {
  const map: Record<string, string> = {
    idp_disabled: "Single sign-on is not enabled.",
    idp_misconfigured:
      "Single sign-on is not configured correctly. Check server environment variables.",
    idp_authorize_denied: "Sign-in was cancelled.",
    missing_code: "Authorization code missing. Try signing in again.",
    missing_state:
      "Sign-in session expired or incomplete (missing state). Try again.",
    invalid_state: "Invalid sign-in session. Try again.",
    missing_pkce: "Sign-in session expired. Try again.",
    invalid_return_to: "Invalid redirect.",
    token_exchange_failed:
      "Could not complete sign-in with the identity provider.",
    invalid_token_response: "Invalid response from identity provider.",
    identity_failed: "Could not read your profile from the identity provider.",
    user_not_found:
      "No account found for this user. Contact your administrator.",
    user_mapping_failed: "Could not link your account.",
    session_failed: "Could not create a session.",
  };
  return map[code] || "Sign-in failed.";
}

function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/**
 * When IdP is enabled: no email/password UI — browser goes straight to IdP via /api/auth/idp/start.
 * Only if SSO failed (?error=) we show a minimal message + retry link.
 */
function IdpLoginRedirect() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(loginErrorMessage(err));
      return;
    }
    const returnTo = safeReturnTo(params.get("returnTo"));
    window.location.replace(
      `/api/auth/idp/start?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, []);

  if (error) {
    const retry = `/api/auth/idp/start?returnTo=${encodeURIComponent("/dashboard")}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="text-center text-sm text-red-600 max-w-md">
          <p>{error}</p>
          <a
            href={retry}
            className="mt-4 inline-block text-orange-600 underline"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-600">Redirecting…</p>
    </div>
  );
}

// Real authentication function
const authenticate = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  try {
    const response = await axiosInstance.post("/api/auth/login", {
      email,
      password,
    });

    const data = response.data;

    if (response.status !== 200) {
      throw new Error(data.error || "Authentication failed");
    }

    return {
      success: true,
      token: data.token,
      user: {
        user_id: data.user.user_id,
        email: data.user.email,
        first_name: data.user.account?.first_name || "",
        last_name: data.user.account?.last_name || "",
        role: data.user.role?.name || "",
      },
    };
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { error?: string } };
      message?: string;
    };
    return {
      success: false,
      error:
        err.response?.data?.error ||
        err.message ||
        "An error occurred during authentication",
    };
  }
};

function PasswordLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    rememberMe: boolean;
  }>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  // Load remembered email if exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rememberedEmail = localStorage.getItem("wujha-remember-email");
      if (rememberedEmail) {
        setFormData((prev) => ({
          ...prev,
          email: rememberedEmail,
          rememberMe: true,
        }));
      }
    }
  }, []);

  const validateForm = () => {
    let isValid = true;
    const newErrors: { email?: string; password?: string; general?: string } =
      {};

    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 4) {
      newErrors.password = "Password must be at least 4 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await authenticate(formData.email, formData.password);

      if (result.success && result.token) {
        if (typeof window !== "undefined") {
          if (formData.rememberMe) {
            localStorage.setItem("wujha-remember-email", formData.email);
          } else {
            localStorage.removeItem("wujha-remember-email");
          }
        }

        localStorage.setItem("token", result.token);

        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } else {
        setErrors((prev) => ({
          ...prev,
          general: result.error || "Authentication failed",
        }));
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors((prev) => ({
        ...prev,
        general: "An unexpected error occurred. Please try again.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col transition-colors">
      <div className="flex flex-col md:flex-row flex-1">
        {/* Left side - form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <div className="text-2xl font-bold text-orange-600">
                WUJHA PMO
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-6 text-center">
              Sign in to your account
            </h1>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={`w-full px-4 py-2 rounded border ${
                    errors.email
                      ? "border-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white transition-colors`}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-sm text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className={`w-full px-4 py-2 rounded border ${
                      errors.password
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white transition-colors pr-10`}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 transition-colors"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    setFormData({ ...formData, rememberMe: e.target.checked })
                  }
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm">
                  Remember me
                </label>
              </div>

              {errors.general && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-400 text-sm">
                  {errors.general}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-8 flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="hidden md:flex md:w-1/2 bg-orange-600 p-8 justify-center items-center text-white">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4">Welcome to WUJHA PMO</h2>
            <p className="mb-8">
              Streamline your project management processes with our
              comprehensive project management office system.
            </p>
            <div className="mx-auto w-64 h-64 bg-white/10 rounded-full flex items-center justify-center">
              <div className="text-6xl font-bold">PMO</div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-sm text-gray-500 bg-gray-100 dark:bg-[#2A2A2A] transition-colors">
        <p>&copy; {new Date().getFullYear()} WUJHA PMO. All Rights Reserved.</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  if (useIdpLogin) {
    return <IdpLoginRedirect />;
  }
  return <PasswordLoginPage />;
}
