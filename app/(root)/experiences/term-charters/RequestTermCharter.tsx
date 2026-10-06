"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Users, DollarSign, Globe, Anchor } from "lucide-react";
import { createTermCharterLead } from "@/features/bookings/actions/booking-request.actions";
import { toast } from "@/shared/lib/hooks/use-toast";
import { termCharterInquirySchema, type TermCharterFormData } from "@/shared/lib/validation/inquiry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

const DURATION_OPTIONS = [
  { value: "3-6 days", label: "3-6 days" },
  { value: "1 week", label: "1 week" },
  { value: "2 weeks", label: "2 weeks" },
  { value: "3+ weeks", label: "3+ weeks" },
  { value: "Flexible", label: "Flexible" },
] as const;

const BUDGET_OPTIONS = [
  { value: "$0-$10,000", label: "$0-$10,000" },
  { value: "$10,000-$25,000", label: "$10,000-$25,000" },
  { value: "$25,000-$50,000", label: "$25,000-$50,000" },
  { value: "$50,000-$100,000", label: "$50,000-$100,000" },
  { value: "$100,000+", label: "$100,000+" },
  { value: "Flexible", label: "Flexible" },
] as const;

const DESTINATION_OPTIONS = [
  { value: "Bahamas", label: "Bahamas" },
  { value: "Caribbean", label: "Caribbean Islands" },
  { value: "Mediterranean", label: "Mediterranean" },
  { value: "Florida Keys", label: "Florida Keys" },
  { value: "Other", label: "Other (specify in message)" },
  { value: "Flexible", label: "Flexible" },
] as const;

const inputClass = "h-11 rounded-xl border-border bg-muted/10 focus-visible:ring-2 focus-visible:ring-ring";

export default function RequestTermCharter() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<TermCharterFormData>({
    resolver: zodResolver(termCharterInquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      startDate: "",
      duration: "",
      destination: "",
      guests: "",
      budget: "",
      accommodations: "",
      message: "",
      termsAgreed: false,
    },
  });

  const onSubmit = useCallback(
    async (values: TermCharterFormData) => {
      try {
        setIsSubmitting(true);
        const result = await createTermCharterLead(values);

        if (result.success) {
          toast({ title: "Request Submitted", description: "Our specialists will contact you soon!" });
          form.reset();
        } else {
          toast({ title: "Error", description: result.error ?? "Please try again.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary text-xl sm:text-2xl">Request a Term Charter</CardTitle>
          <CardDescription>
            Share your preferences and our specialists will create a custom itinerary for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input className={inputClass} type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input className={inputClass} placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Start Date</FormLabel>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <FormControl>
                          <Input type="date" className={`${inputClass} pl-10`} {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger className={`${inputClass} [&>span]:line-clamp-1`}>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATION_OPTIONS.map((opt) => (
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
                  name="guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guests</FormLabel>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <FormControl>
                          <Input type="number" min={1} className={`${inputClass} pl-10`} placeholder="4" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Range</FormLabel>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <SelectTrigger className={`${inputClass} pl-10 [&>span]:line-clamp-1`}>
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                              {BUDGET_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Destination</FormLabel>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger className={`${inputClass} pl-10 [&>span]:line-clamp-1`}>
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                          <SelectContent>
                            {DESTINATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accommodations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accommodation Preferences</FormLabel>
                    <div className="relative">
                      <Anchor className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <FormControl>
                        <Textarea
                          className={`${inputClass} min-h-[80px] pl-10 resize-none`}
                          placeholder="Number of cabins needed, preferred layout, etc."
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Requests</FormLabel>
                    <FormControl>
                      <Textarea
                        className={`${inputClass} min-h-[80px] resize-none`}
                        placeholder="Special requests, activities, dietary requirements, etc."
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
                  <FormItem className="flex flex-row items-start gap-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer text-foreground">
                      I agree to the{" "}
                      <Link href="/terms-of-service" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size="lg" className="w-full h-12 rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Term Charter Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
