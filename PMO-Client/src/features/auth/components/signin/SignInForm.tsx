"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { BRAND } from "@/lib/brand";
import { Spinner } from "@/components/ui/spinner";
import { notConnected } from "@/lib/not-connected";

const REMEMBER_EMAIL_KEY = "bright-remember-email";

const FIELD_CLASS =
  "h-11 w-full rounded-[11px] border border-border bg-bg-surface px-3.5 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-secondary/60 focus:border-bright-primary focus:outline-none focus:ring-[3px] focus:ring-bright-primary/20 disabled:opacity-60";

export function SignInForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  // Sign-in is not connected to a backend yet, so nothing is ever loading and
  // no error comes back. Both stay so the form's states are ready for it.
  const isLoading = false;
  const formError: string | null = null;

  // Restore a remembered address. Reads localStorage after mount so the
  // screen renders statically.
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (rememberedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true,
      }));
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formData.rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
    notConnected("Sign-in");
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
            className="h-4 w-4 rounded border-border accent-bright-primary"
          />
          Remember my email
        </label>

        {formError && (
          <div
            role="alert"
            className="rounded-[11px] border border-bright-danger/30 bg-bright-danger/10 px-3.5 py-2.5 text-[13px] text-bright-danger"
          >
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-bright-primary text-sm font-semibold text-white shadow-sm transition-all hover:bg-bright-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bright-primary/30 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Spinner size={16} />
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
