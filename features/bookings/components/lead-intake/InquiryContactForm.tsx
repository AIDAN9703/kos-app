"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { phoneRequiredSchema } from "@/shared/lib/validation/common";
import {
  boatMemberInquiryContactSchema,
  type BoatMemberInquiryContactFormData,
} from "@/shared/lib/validation/inquiry";

const inputClass =
  "h-11 rounded-xl border-border bg-muted/10 focus-visible:ring-2 focus-visible:ring-ring";

interface InquirySignedInUser {
  firstName: string;
  name: string;
  email: string;
  phone: string;
}

interface InquiryContactFormProps {
  currentUser: InquirySignedInUser;
  onSubmit: (values: BoatMemberInquiryContactFormData) => void | Promise<void>;
  isSubmitting?: boolean;
  id?: string;
}

/**
 * Step 2 for SIGNED-IN users: identity comes from the account, so this only
 * asks for what the account can't answer — a phone number when it's missing,
 * optional trip notes, and terms. Guests never reach this form; they sign in
 * or create an account via the auth modal first.
 */
export default function InquiryContactForm({
  currentUser,
  onSubmit,
  isSubmitting = false,
  id = "inquiry-contact-form",
}: InquiryContactFormProps) {
  const needsPhone = !currentUser.phone.trim();

  // Phone is only enforced when the account doesn't already have one.
  const formSchema = useMemo(
    () =>
      needsPhone
        ? boatMemberInquiryContactSchema.extend({ phone: phoneRequiredSchema })
        : boatMemberInquiryContactSchema,
    [needsPhone]
  );

  const form = useForm<BoatMemberInquiryContactFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      message: "",
      termsAgreed: false,
    },
    mode: "onChange",
  });

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          Welcome back{currentUser.firstName ? `, ${currentUser.firstName}` : ""}.
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This request will be linked to your account
          {currentUser.email ? (
            <>
              {" "}
              (<span className="text-foreground">{currentUser.email}</span>)
            </>
          ) : null}
          .
        </p>
      </div>

      <Form {...form}>
        <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {needsPhone && (
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="overflow-hidden rounded-xl border border-border px-4 py-3">
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Phone
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={inputClass}
                      type="tel"
                      autoComplete="tel"
                      placeholder="(555) 555-5555"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Your account doesn&apos;t have a phone number yet — add one so our team can
                    reach you.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes{" "}
                  <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[88px] rounded-xl border-border bg-muted/10"
                    placeholder="Anything we should know about your trip?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="termsAgreed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal text-muted-foreground">
                    I agree to the{" "}
                    <Link
                      href="/terms-of-service"
                      className="text-primary-strong underline-offset-4 hover:underline"
                    >
                      terms and conditions
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {isSubmitting && (
            <p className="text-center text-sm text-muted-foreground">Submitting your request…</p>
          )}
        </form>
      </Form>
    </section>
  );
}
