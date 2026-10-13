"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGeneralLead } from "@/features/bookings/actions/booking-request.actions";
import { toast } from "@/shared/lib/hooks/use-toast";
import { requestToBookSchema, type RequestToBookFormData } from "@/shared/lib/validation/inquiry";
import { cn } from "@/shared/lib/utils/general-utils";
import { Container } from "./ui";

type Blank = "name" | "guests" | "date" | "budget" | "message" | "email" | "phone";

function firstError(errors: FieldErrors<RequestToBookFormData>) {
  const order: (keyof RequestToBookFormData)[] = ["name", "email", "phone", "termsAgreed"];
  for (const key of order) {
    const message = errors[key]?.message;
    if (message) return String(message);
  }
  return null;
}

/**
 * The inquiry form as a sentence to fill in, on a dark band. Sends the same
 * lead as today's landing-page form.
 */
export function PlanSentence() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RequestToBookFormData>({
    resolver: zodResolver(requestToBookSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date: "",
      budget: "",
      guests: "",
      message: "",
      termsAgreed: false,
      smsConsent: false,
    },
  });

  async function onSubmit(values: RequestToBookFormData) {
    setIsSubmitting(true);
    try {
      const result = await createGeneralLead({
        name: values.name,
        email: values.email,
        phone: values.phone,
        date: values.date || undefined,
        budget: values.budget || undefined,
        guests: values.guests || undefined,
        message: values.message ? `Occasion: ${values.message}` : undefined,
        termsAgreed: values.termsAgreed,
        smsConsent: values.smsConsent,
        source: "HOME_PAGE",
      });
      if (result.success) {
        toast({
          title: "Request sent",
          description: result.message ?? "We'll be in touch within 24 hours.",
        });
        reset();
      } else {
        toast({
          title: "Couldn't send",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Couldn't send",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const dateValue = watch("date");

  function blank(
    name: Blank,
    placeholder: string,
    width: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) {
    return (
      <input
        {...register(name)}
        {...props}
        aria-label={placeholder}
        placeholder={placeholder}
        style={{ width }}
        className={cn(
          "mx-1 inline-block max-w-full rounded-none border-0 border-b-2 bg-transparent px-1 pb-0.5 align-baseline font-bold text-white transition-colors placeholder:font-semibold placeholder:text-white/25 focus:outline-none",
          errors[name] ? "border-red-400" : "border-white/25 focus:border-gold",
          // An empty date shows the browser's mm/dd/yyyy, which should read as a placeholder.
          name === "date" && !dateValue && "font-semibold text-white/30"
        )}
      />
    );
  }

  const error = firstError(errors);

  return (
    <section
      id="plan"
      className="scroll-mt-20 bg-dark-bg py-20 text-white [color-scheme:dark] sm:py-28"
    >
      <Container>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-glow">
          Plan a charter
        </p>
        <h2 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-6xl">
          Tell us about your charter.
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 sm:mt-14">
          <p className="max-w-5xl text-[1.35rem] font-semibold leading-[2.1] text-white/55 sm:text-[2rem] sm:leading-[2]">
            Hi, I&apos;m {blank("name", "your name", "9em", { autoComplete: "name" })}. We&apos;re{" "}
            {blank("guests", "8", "2.6em", { type: "number", min: 1, inputMode: "numeric" })}{" "}
            guests, hoping for {blank("date", "a date", "8.4em", { type: "date" })}, with a budget
            around {blank("budget", "$3,000", "5em", { inputMode: "numeric" })}. The occasion is{" "}
            {blank("message", "a birthday", "9em")}. You can reach me at{" "}
            {blank("email", "email", "10em", { type: "email", autoComplete: "email" })} or{" "}
            {blank("phone", "phone", "7em", { type: "tel", autoComplete: "tel" })}.
          </p>

          <div className="mt-10 flex flex-col gap-8 border-t border-white/10 pt-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 text-sm text-white/60">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  {...register("termsAgreed")}
                  className="mt-0.5 size-4 shrink-0 accent-[#b2a37a]"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms-of-service" className="font-medium text-white hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-medium text-white hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  {...register("smsConsent")}
                  className="mt-0.5 size-4 shrink-0 accent-[#b2a37a]"
                />
                <span>I agree to receive SMS updates. Message &amp; data rates may apply.</span>
              </label>
              {error && <p className="font-medium text-red-300">{error}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-14 items-center rounded-full bg-gold px-9 text-base font-bold text-dark-bg transition-colors hover:bg-gold-glow disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : "Send it over"}
              </button>
              <p className="text-sm text-white/50">
                or call{" "}
                <a
                  href="tel:+13055218877"
                  className="font-semibold text-white hover:text-gold-glow"
                >
                  (305) 521-8877
                </a>
              </p>
            </div>
          </div>
        </form>
      </Container>
    </section>
  );
}
