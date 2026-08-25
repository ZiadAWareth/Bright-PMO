"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axios";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { BRAND } from "@/lib/brand";
import { loginErrorMessage, safeReturnTo, DEFAULT_HOME_PATH } from "./constants";

const REMEMBER_EMAIL_KEY = "wujha-remember-email";

const FIELD_CLASS =
  "h-11 w-full rounded-[11px] border border-border bg-bg-surface px-3.5 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-secondary/60 focus:border-wujha-primary focus:outline-none focus:ring-[3px] focus:ring-wujha-primary/20 disabled:opacity-60";

type LoginResponse = {
  token?: string;
  user?: {
    user_id: number | string;
    email: string;
    role?: string;
  };
};

export function SignInForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Surface middleware/IdP errors passed as `?error=`, and restore a
  // remembered address. Reads `window.location` rather than `useSearchParams`
  // so this screen needs no Suspense boundary to render statically.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const error = new URLSearchParams(window.location.search).get("error");
    if (error) {
      const message = loginErrorMessage(error);
      setFormError(message);
      toast.error(message);
    }

    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (rememberedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true,
      }));
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      const response = await axiosInstance.post<LoginResponse>(
        "/api/auth/login",
        { email: formData.email, password: formData.password },
      );

      const data = response.data;
      if (!data?.token) {
        throw new Error("Sign-in succeeded but no session token was returned.");
      }

      if (formData.rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      localStorage.setItem("token", data.token);
      if (data.user?.role) {
        localStorage.setItem("role", data.user.role);
      }
      if (data.user?.user_id != null) {
        localStorage.setItem("userId", String(data.user.user_id));
      }

      toast.success(`Welcome back, ${data.user?.email ?? "there"}!`);

      // Full navigation rather than router.push: the signed-in shell reads the
      // token and role from localStorage as it mounts, and a soft push can land
      // on the dashboard before that write is visible to the new tree.
      const returnTo = safeReturnTo(
        new URLSearchParams(window.location.search).get("returnTo"),
      );
      window.location.assign(returnTo || DEFAULT_HOME_PATH);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { error?: string } };
        message?: string;
      };
      const message =
        err.response?.data?.error ??
        (err.response?.status === 401
          ? "Invalid email or password"
          : err.message) ??
        "Unable to sign in. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Welcome back"
      subtitle={`Sign in to your ${BRAND.productTitle} account to continue.`}
      backHref="/"
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[13px] font-medium text-text-primary"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[13px] font-medium text-text-primary"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={isLoading}
              className={`${FIELD_CLASS} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-secondary">
          <input
            type="checkbox"
            checked={formData.rememberMe}
            onChange={(e) =>
              setFormData({ ...formData, rememberMe: e.target.checked })
            }
            disabled={isLoading}
            className="h-4 w-4 rounded border-border accent-wujha-primary"
          />
          Remember my email
        </label>

        {formError && (
          <div
            role="alert"
            className="rounded-[11px] border border-wujha-danger/30 bg-wujha-danger/10 px-3.5 py-2.5 text-[13px] text-wujha-danger"
          >
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-wujha-primary text-sm font-semibold text-white shadow-sm transition-all hover:bg-wujha-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-wujha-primary/30 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
