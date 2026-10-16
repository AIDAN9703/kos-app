"use client";

import Link from "next/link";
import { useFormContext } from "react-hook-form";
import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/shared/components/ui/form";
import { Textarea } from "@/shared/components/ui/textarea";
import { OwnerAccountPicker } from "@/features/owner-accounts/components/OwnerAccountPicker";
import type { OwnerAccountOption } from "@/features/owner-accounts/owner-accounts.types";

export function OwnerSection({ owners }: { owners: OwnerAccountOption[] }) {
  const form = useFormContext();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-4 w-4" />
          Owner
        </CardTitle>
        <CardDescription>Who the boat belongs to and who KOS pays</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FormField
            control={form.control}
            name="ownerAccountId"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Owner <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <OwnerAccountPicker
                    owners={owners}
                    value={field.value || ""}
                    onChange={field.onChange}
                    invalid={Boolean(fieldState.error)}
                    className="h-11 rounded-lg"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  KOS Yachts until the real owner is set up.{" "}
                  <Link href="/admin/owners" className="underline underline-offset-2">
                    Manage owners
                  </Link>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField control={form.control} name="ownerNotes" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Owner Notes</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ""}
                placeholder="Internal notes about the owner or boat for admin use..."
                className="min-h-[100px] resize-none"
              />
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground">
              Internal notes about the owner or special requirements (visible only to admins)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      </CardContent>
    </Card>
  );
}
