"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGeneralLead } from "@/features/bookings/actions/booking-request.actions";
import { toast } from "@/shared/lib/hooks/use-toast";
import { requestToBookSchema, type RequestToBookFormData } from "@/shared/lib/validation/inquiry";

//UI Imports
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/* Admin-portal input language, tuned for the navy band: translucent fill,
   no visible border until focus, then a quiet gold ring. */
const inputClass =
  "h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/35 shadow-none " +
  "transition-colors hover:bg-white/[0.08] " +
  "focus-visible:border-gold/50 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold/25";

const labelClass = "text-[13px] font-medium text-white/70";

/* Checkboxes need their own dark treatment — the default navy fill vanishes
   on this background; checked state goes gold like the admin's primary. */
const checkboxClass =
  "border-white/30 data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-dark-bg";

const TIME_OF_DAY_OPTIONS = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "FLEXIBLE", label: "Flexible" },
] as const;

interface RequestToBookProps {
  /** Which page hosts this form — recorded on the lead for source attribution. */
  source?: "HOME_PAGE" | "CONTACT_PAGE";
}

/**
 * The landing page's closing section: one flat navy band, no card. The form
 * sits directly on the section — soft translucent fields, a single vertical
 * hairline for structure, and one gold CTA. Same surface language as the
 * admin portal.
 */
export default function RequestToBook({ source = "HOME_PAGE" }: RequestToBookProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<RequestToBookFormData>({
    resolver: zodResolver(requestToBookSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date: "",
      timeOfDay: undefined,
      budget: "",
      guests: "",
      message: "",
      termsAgreed: false,
      smsConsent: false,
    },
  });

  async function onSubmit(values: RequestToBookFormData) {
    try {
      setIsSubmitting(true);

      const result = await createGeneralLead({
        name: values.name,
        email: values.email,
        phone: values.phone,
        date: values.date || undefined,
        timeOfDay: values.timeOfDay || undefined,
        budget: values.budget || undefined,
        guests: values.guests || undefined,
        message: values.message || undefined,
        termsAgreed: values.termsAgreed,
        smsConsent: values.smsConsent,
        source,
      });

      if (result.success) {
        toast({
          title: "Request Submitted",
          description: result.message ?? "We'll contact you soon!",
        });
        form.reset();
      } else {
        toast({
          title: "Error",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    /* py-16 matches the other navy band (Testimonials); the inner container
       mirrors the page shell (max-w-[1200px] px-4 sm:px-8) so content edges
       line up section to section. [color-scheme:dark] keeps native widgets
       (date picker glyph) legible on navy. */
    <section id="request-to-book" className="w-full scroll-mt-4 bg-primary py-16 [color-scheme:dark]">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-0">
          {/* ── The pitch ── */}
          <div className="lg:col-span-5 lg:pr-16">
            {/* Same scale as every other landing-section heading. */}
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-4xl">
              Ready for your next adventure?
            </h2>
            <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-white/70 sm:text-base">
              Tell us the date, group size, and budget — we&apos;ll reply within 24 hours with the
              right boat, captain, and route. No payment until you approve the plan.
            </p>
            <p className="mt-8 text-sm text-white/60">
              Rather browse and book instantly?{" "}
              <Link
                href="/boats/search"
                className="font-medium text-white underline decoration-gold/60 underline-offset-4 transition-colors hover:decoration-gold"
              >
                Explore the fleet
              </Link>
            </p>
          </div>

          {/* ── The form, directly on the band ── */}
          <div className="lg:col-span-7 lg:border-l lg:border-white/10 lg:pl-16">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Full name</FormLabel>
                        <FormControl>
                          <Input className={inputClass} placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Email</FormLabel>
                        <FormControl>
                          <Input
                            className={inputClass}
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Phone</FormLabel>
                        <FormControl>
                          <Input className={inputClass} placeholder="+1 (555) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Guests</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            className={inputClass}
                            placeholder="4"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Preferred date</FormLabel>
                        <FormControl>
                          <Input type="date" className={inputClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeOfDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Time</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <SelectTrigger
                              className={`${inputClass} w-full data-[placeholder]:text-white/35 [&>span]:line-clamp-1`}
                            >
                              <SelectValue placeholder="Flexible" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OF_DAY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Budget (USD)</FormLabel>
                        <FormControl>
                          <Input className={inputClass} placeholder="5,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Anything else?</FormLabel>
                      <FormControl>
                        <Textarea
                          className={`${inputClass} min-h-[88px] resize-none pt-3`}
                          placeholder="Occasion, destination, special requests…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2.5 border-t border-white/10 pt-5">
                  <FormField
                    control={form.control}
                    name="termsAgreed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-2.5">
                        <FormControl>
                          <Checkbox
                            className={checkboxClass}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer text-xs font-normal leading-relaxed text-white/60">
                          I agree to the{" "}
                          <Link
                            href="/terms-of-service"
                            className="font-medium text-white hover:underline"
                          >
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="font-medium text-white hover:underline">
                            Privacy Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="smsConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-2.5">
                        <FormControl>
                          <Checkbox
                            className={checkboxClass}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer text-xs font-normal leading-relaxed text-white/60">
                          I agree to receive SMS updates. Message &amp; data rates may apply.
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* The band's one strong accent — gold, like the admin's main CTA */}
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-xl bg-gold text-[15px] font-semibold text-dark-bg hover:bg-gold-glow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending…" : "Send request"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
