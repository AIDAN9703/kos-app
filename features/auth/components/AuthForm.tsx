"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
  UseFormReturn,
} from "react-hook-form";
import { ZodType } from "zod";
import { useSyncExternalStore } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import Link from "next/link";
import { FIELD_NAMES, FIELD_TYPES } from "@/shared/lib/constants";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { continueWithGoogle } from "@/features/auth/client/email-auth";
import { authClient } from "@/shared/lib/auth/auth-client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  bookingAuthInputClass,
  bookingAuthMenuButtonClass,
  bookingAuthPrimaryButtonClass,
} from "@/features/bookings/components/booking-auth-ui";

interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (
    data: T
  ) => Promise<{
    success: boolean;
    error?: string;
    data?: { redirectUrl?: string; message: string };
  }>;
  type: "SIGN_IN" | "SIGN_UP";
  /** Used when the form is embedded (e.g. booking flow modal) so callback returns to this URL */
  embeddedCallbackUrl?: string;
  embeddedPrefillEmail?: string;
  embeddedPrefillPhone?: string;
  /** Hide the card header when the dialog already has a title */
  hideHeading?: boolean;
  /** Lighter chrome for use inside a Dialog */
  variant?: "page" | "embedded";
  /** Switch sign-in ↔ sign-up without leaving the page (booking modal) */
  onSwitchToSignUp?: () => void;
  onSwitchToSignIn?: () => void;
}

const noSubscription = () => () => {};

/** Small pill marking the sign-in method this browser used last time. */
function LastUsedPill() {
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      Last used
    </span>
  );
}

/** Messages for ?error= codes Better Auth sends back after a failed Google sign-in. */
function googleErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "account_not_linked") {
    return "This email already has an account. Sign in with your password, then connect Google in Account settings.";
  }
  if (code === "banned") return "This account is suspended. Contact us if you think that's a mistake.";
  return "Google sign-in didn't work. Please try again.";
}

const AuthForm = <T extends FieldValues>({
  type,
  schema,
  defaultValues,
  onSubmit,
  embeddedCallbackUrl,
  embeddedPrefillEmail,
  embeddedPrefillPhone,
  hideHeading = false,
  variant = "page",
  onSwitchToSignUp,
  onSwitchToSignIn,
}: Props<T>) => {
  const searchParams = useSearchParams();
  const isSignIn = type === "SIGN_IN";
  const { isSubmitting, handleAuth } = useAuth<T>();

  const callbackUrl =
    embeddedCallbackUrl ?? (searchParams.get("callbackUrl") || "/");
  const prefilledEmail =
    embeddedPrefillEmail ?? searchParams.get("email") ?? "";
  const prefilledPhone =
    embeddedPrefillPhone ?? searchParams.get("phone") ?? "";

  const mergedDefaultValues = {
    ...defaultValues,
    ...(prefilledEmail && { email: prefilledEmail }),
    ...(prefilledPhone && { phoneNumber: prefilledPhone }),
  } as DefaultValues<T>;

  const form: UseFormReturn<T> = useForm({
    resolver: zodResolver(schema),
    defaultValues: mergedDefaultValues,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    const successMessage = isSignIn
      ? "You have successfully signed in."
      : "You have successfully signed up.";
    await handleAuth(data, onSubmit, callbackUrl, successMessage);
  };

  const isEmbedded = variant === "embedded";
  // From a cookie only the browser can read; null during the server render.
  const lastMethod = useSyncExternalStore(
    noSubscription,
    () => authClient.getLastUsedLoginMethod(),
    () => null
  );
  const googleError = isEmbedded ? null : googleErrorMessage(searchParams.get("error"));

  return (
    <div
      className={
        isEmbedded
          ? "w-full"
          : "bg-white rounded-xl border width-[400px] border-gray-200 p-6 sm:p-8 shadow-sm"
      }
    >
      {/* Header */}
      {!hideHeading && (
        <div className={isEmbedded ? "mb-4 text-center" : "mb-6 sm:mb-7 text-center"}>
          <h1 className="text-lg sm:text-xl font-semibold text-primary">
            {isSignIn ? "Sign In" : "Create Account"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isSignIn
              ? "Welcome back! Please enter your details."
              : "Get started with your free account."}
          </p>
        </div>
      )}

      {googleError && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {googleError}
        </p>
      )}

      {/* Google Sign In */}
      <div className={isEmbedded ? "mb-4" : "mb-5"}>
        <button
          type="button"
          onClick={() => continueWithGoogle(callbackUrl)}
          className={
            isEmbedded
              ? `${bookingAuthMenuButtonClass} gap-2.5`
              : "flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-gray-200 text-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] sm:h-10"
          }
        >
          <Image
            src="/icons/google.svg"
            alt="Google"
            width={18}
            height={18}
            className="sm:h-4 sm:w-4"
          />
          <span className={isEmbedded ? "font-medium text-foreground" : "font-medium text-gray-600"}>
            Continue with Google
          </span>
          {lastMethod === "google" && <LastUsedPill />}
        </button>
      </div>

      {/* Divider */}
      <div className={`relative flex items-center gap-3 ${isEmbedded ? "mb-4" : "mb-5"}`}>
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs uppercase tracking-wide text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={
                      isEmbedded
                        ? "text-sm font-semibold text-foreground"
                        : "ml-1 text-sm font-medium text-gray-700"
                    }
                  >
                    {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
                  </FormLabel>
                  <FormControl>
                    {FIELD_TYPES[field.name as keyof typeof FIELD_TYPES] === "password" ? (
                      <PasswordInput
                        required
                        autoComplete={isSignIn ? "current-password" : "new-password"}
                        {...field}
                        className={isEmbedded ? bookingAuthInputClass : "h-10 text-sm"}
                        placeholder="Enter your password"
                      />
                    ) : (
                      <Input
                        required
                        type={FIELD_TYPES[field.name as keyof typeof FIELD_TYPES]}
                        {...field}
                        className={isEmbedded ? bookingAuthInputClass : "h-10 text-sm"}
                        placeholder={`Enter your ${((FIELD_NAMES[field.name as keyof typeof FIELD_NAMES] ?? field.name) || "").toLowerCase()}`}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          {isSignIn && (
            <div className="-mt-1 text-right">
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className={
              isEmbedded
                ? `${bookingAuthPrimaryButtonClass} mt-1`
                : "mt-2 h-11 w-full text-sm font-medium transition-transform active:scale-[0.98] sm:h-10"
            }
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isSignIn ? "Signing in..." : "Creating account..."}</span>
              </div>
            ) : isSignIn ? (
              <span className="flex items-center gap-2">
                Sign in
                {lastMethod === "email" && <LastUsedPill />}
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </Form>

      {/* Footer */}
      <p className="text-sm text-gray-500 mt-6 text-center">
        {isSignIn ? "Don't have an account? " : "Already have an account? "}
        {isSignIn && onSwitchToSignUp ? (
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </button>
        ) : !isSignIn && onSwitchToSignIn ? (
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        ) : (
          <Link
            href={
              (isSignIn ? "/sign-up" : "/sign-in") +
              (callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "")
            }
            className="font-medium text-primary hover:underline"
          >
            {isSignIn ? "Sign up" : "Sign in"}
          </Link>
        )}
        <br />
        <br />
        This site is protected by reCAPTCHA, Google{" "}
        <Link
          href="https://policies.google.com/privacy"
          className="font-medium text-primary hover:underline"
        >
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          href="https://policies.google.com/terms"
          className="font-medium text-primary hover:underline"
        >
          Terms of Service
        </Link>{" "}
        apply.
      </p>
      
    </div>
  );
};

export default AuthForm;
