"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import AuthForm from "@/features/auth/components/AuthForm";
import { signInWithEmail, signUpWithEmail } from "@/features/auth/client/email-auth";
import { signInSchema, signUpSchema } from "@/features/_validation/validations";
import { startListingAction } from "../../listing.actions";
import { shownCatalogName } from "@/features/boat-catalog/boat-catalog.keys";
import { listingStepHref } from "../../listing.constants";
import { basicsSchema } from "../../listing.validation";
import { BasicsForm, type BasicsValues } from "./BasicsForm";
import type { CatalogMake } from "@/features/boat-catalog/boat-catalog.types";

/**
 * Step one, before the listing exists. Signed-in owners save straight away.
 * Everyone else fills in the boat, then makes an account right here; the
 * answers ride along in the return URL and the listing is created when they
 * come back signed in.
 */
export function StartListing({
  catalog,
  initial,
  signedIn,
  resume,
}: {
  catalog: CatalogMake[];
  initial: BasicsValues;
  signedIn: boolean;
  resume: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();
  const [formError, setFormError] = useState<string>();
  // Arriving from the hero card signed out: the boat is filled in, so go
  // straight to making an account.
  const [account, setAccount] = useState<{
    values: BasicsValues;
    mode: "sign-up" | "sign-in";
  } | null>(() =>
    resume && !signedIn && basicsSchema.safeParse(initial).success
      ? { values: initial, mode: "sign-up" }
      : null
  );
  const resumed = useRef(false);

  function create(values: BasicsValues) {
    startTransition(async () => {
      const result = await startListingAction(values);
      if (!result.success || !result.data) {
        setFieldErrors(result.fieldErrors);
        setFormError(result.fieldErrors ? undefined : result.error);
        setAccount(null);
        return;
      }
      router.replace(listingStepHref(result.data.id, "location"));
    });
  }

  // Back from sign-up with the boat in the URL: create the listing once.
  useEffect(() => {
    if (resume && signedIn && !resumed.current) {
      resumed.current = true;
      create(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, signedIn]);

  if (resume && signedIn && !formError && !fieldErrors) {
    return (
      <p className="flex items-center gap-3 text-[15px] text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving your boat…
      </p>
    );
  }

  if (account) {
    const callbackUrl = `${pathname}?${new URLSearchParams({ ...account.values, resume: "1" })}`;
    return (
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-primary">
          {account.mode === "sign-up" ? "Create your account to save it" : "Sign in to save it"}
        </h2>
        <p className="mt-1.5 text-[15px] leading-7 text-slate-600">
          Your{" "}
          {[shownCatalogName(account.values.make), shownCatalogName(account.values.model)]
            .filter(Boolean)
            .join(" ") || "boat"}{" "}
          is ready. An account keeps the listing so you can finish it any time.
        </p>
        <div className="mt-6">
          {account.mode === "sign-up" ? (
            <AuthForm
              key="listing-sign-up"
              type="SIGN_UP"
              schema={signUpSchema}
              defaultValues={{
                email: "",
                firstName: "",
                lastName: "",
                phoneNumber: "",
                password: "",
              }}
              onSubmit={signUpWithEmail}
              embeddedCallbackUrl={callbackUrl}
              variant="embedded"
              hideHeading
              onSwitchToSignIn={() => setAccount({ ...account, mode: "sign-in" })}
            />
          ) : (
            <AuthForm
              key="listing-sign-in"
              type="SIGN_IN"
              schema={signInSchema}
              defaultValues={{ email: "", password: "" }}
              onSubmit={signInWithEmail}
              embeddedCallbackUrl={callbackUrl}
              variant="embedded"
              hideHeading
              onSwitchToSignUp={() => setAccount({ ...account, mode: "sign-up" })}
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => setAccount(null)}
          className="mt-6 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-primary hover:underline"
        >
          Back to the boat details
        </button>
      </div>
    );
  }

  return (
    <BasicsForm
      catalog={catalog}
      initial={initial}
      pending={pending}
      fieldErrors={fieldErrors}
      formError={formError}
      submitLabel="Continue"
      backHref="/list-your-boat"
      onSubmit={(values) => {
        if (signedIn) return create(values);
        // Check the boat before asking for an account.
        const check = basicsSchema.safeParse(values);
        if (!check.success) {
          setFieldErrors(check.error.flatten().fieldErrors as Record<string, string[]>);
          return;
        }
        setFieldErrors(undefined);
        setAccount({ values, mode: "sign-up" });
      }}
    />
  );
}
