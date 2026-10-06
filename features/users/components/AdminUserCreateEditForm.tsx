"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { User, Key, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  ASSIGNABLE_ROLES,
  ASSIGNABLE_ROLE_LABELS,
  type AssignableRole,
} from "@/features/users/user-roles.constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { toast } from "@/shared/lib/hooks/use-toast";
import { updateUser, createUser } from "@/features/users/user.mutations";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/features/users/user.validation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

interface AdminUserCreateEditFormProps {
  user?: Partial<CreateUserInput>;
  userId?: string;
}

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="flex items-center gap-1 mb-1">
    {children}
    <span className="text-destructive">*</span>
  </span>
);

export function AdminUserCreateEditForm({
  user,
  userId,
}: AdminUserCreateEditFormProps) {
  const router = useRouter();
  const isCreating = !userId;
  const formSchema = isCreating ? createUserSchema : updateUserSchema;

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(formSchema),
    defaultValues: user || {
      roles: [],
      emailVerified: false,
      phoneVerified: false,
      identityVerified: false,
      identityVerificationType: null,
    },
  });

  const { isSubmitting, dirtyFields } = form.formState;
  const hasChanges = Object.keys(dirtyFields).length > 0;

  async function onSubmit(data: CreateUserInput | UpdateUserInput) {
    if (isCreating) {
      const result = await createUser(data as CreateUserInput);
      if (!result.success) {
        toast({
          title: "Error",
          description:
            result.error || "Failed to create user. Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Success", description: "User created successfully." });
      router.push("/admin/users");
    } else {
      const result = await updateUser(userId!, data);
      if (!result.success) {
        toast({
          title: "Error",
          description:
            result.error || "Failed to update user. Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Success", description: "User updated successfully." });
      router.push(`/admin/users/${userId}`);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-4 w-4" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="First name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Last name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="User bio"
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="h-4 w-4" />
              Account Information
            </CardTitle>
            <CardDescription>Account credentials and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <RequiredLabel>Username</RequiredLabel>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Username"
                      />
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
                    <FormLabel>
                      <RequiredLabel>Email Address</RequiredLabel>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="email"
                        placeholder="Email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Phone number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isCreating && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Password</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="password"
                          placeholder="Set password"
                        />
                      </FormControl>
                      <FormDescription>
                        Min. 8 characters with uppercase letter and special
                        character
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => {
                  const selected = (field.value ?? []) as AssignableRole[];
                  const toggle = (role: AssignableRole, on: boolean) =>
                    field.onChange(on ? [...selected, role] : selected.filter((r) => r !== role));
                  return (
                    <FormItem className="rounded-lg border p-4">
                      <FormLabel className="text-base">Roles</FormLabel>
                      <FormDescription>
                        Everyone can book. Captain and crew are granted from their own pages.
                      </FormDescription>
                      <div className="mt-3 space-y-3">
                        {ASSIGNABLE_ROLES.map((role) => (
                          <label key={role} className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                              checked={selected.includes(role)}
                              onCheckedChange={(checked) => toggle(role, checked === true)}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="block text-sm font-medium">
                                {ASSIGNABLE_ROLE_LABELS[role].label}
                              </span>
                              <span className="block text-sm text-muted-foreground">
                                {ASSIGNABLE_ROLE_LABELS[role].description}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-4 w-4" />
              Contact Information
            </CardTitle>
            <CardDescription>User&apos;s contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="City"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="State/Province"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Postal code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-4 w-4" />
              Verification Status
            </CardTitle>
            <CardDescription>User verification information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="emailVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Email Verified
                      </FormLabel>
                      <FormDescription>
                        User has verified their email address
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Phone Verified
                      </FormLabel>
                      <FormDescription>
                        User has verified their phone number
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="identityVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Identity Verified
                      </FormLabel>
                      <FormDescription>
                        User has verified their identity
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="identityVerificationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identity Verification Type</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="e.g., Driver's License, Passport"
                      />
                    </FormControl>
                    <FormDescription>
                      Type of identity verification document
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="destructive"
            onClick={() =>
              userId
                ? router.push(`/admin/users/${userId}`)
                : router.push("/admin/users")
            }
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (!isCreating && !hasChanges)}
          >
            {isSubmitting ? "Saving..." : "Save User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
