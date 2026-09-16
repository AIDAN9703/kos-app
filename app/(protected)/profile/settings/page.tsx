import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { updateAccountDetails } from "@/features/profile/actions/account.actions";
import { BillingPortalButton } from "@/features/profile/components/BillingPortalButton";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { EditableField } from "@/features/profile/components/settings/EditableField";
import { NotificationPreferencesForm } from "@/features/profile/components/settings/NotificationPreferencesForm";
import { PasswordSection } from "@/features/profile/components/settings/PasswordSection";
import { ProfilePhotoField } from "@/features/profile/components/settings/ProfilePhotoField";
import { SettingsSection } from "@/features/profile/components/settings/SettingsSection";
import { getAccount } from "@/features/profile/profile.queries";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await requireAuth();
  const account = await getAccount(session.user.id);
  if (!account) redirect("/sign-in");

  return (
    <div>
      <PageHeader title="Account settings" description="Your details, how we reach you, and how you sign in." />

      <div className="mt-8">
        <SettingsSection id="photo" title="Profile photo" description="Shown on your profile and to the crew.">
          <ProfilePhotoField imageUrl={account.profileImage} />
        </SettingsSection>

        <SettingsSection id="personal" title="Personal information" description="How we address you and reach you about trips.">
          <EditableField
            label="Name"
            fields={[
              { key: "firstName", label: "First name", required: true, half: true },
              { key: "lastName", label: "Last name", required: true, half: true },
            ]}
            values={{ firstName: account.firstName, lastName: account.lastName }}
            displayValue={[account.firstName, account.lastName].filter(Boolean).join(" ") || null}
            onSave={updateAccountDetails}
          />
          <EditableField
            label="Email"
            fields={[{ key: "email", label: "Email address", type: "email", required: true }]}
            values={{ email: account.email }}
            description="Confirmations, proposals and receipts go here."
            onSave={updateAccountDetails}
          />
          <EditableField
            label="Phone"
            fields={[{ key: "phoneNumber", label: "Phone number", type: "tel", placeholder: "(305) 555-0123" }]}
            values={{ phoneNumber: account.phoneNumber }}
            description="Your captain uses this on the day of the trip."
            aside={
              account.phoneNumber && account.phoneVerified ? (
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                  Verified
                </span>
              ) : null
            }
            onSave={updateAccountDetails}
          />
          <EditableField
            label="About you"
            fields={[{ key: "bio", label: "Bio", type: "textarea", placeholder: "Anything the crew should know — occasions, favourite spots, how you like to spend a day on the water." }]}
            values={{ bio: account.bio }}
            onSave={updateAccountDetails}
          />
        </SettingsSection>

        <SettingsSection id="address" title="Address" description="Used on invoices and receipts.">
          <EditableField
            label="Home address"
            fields={[
              { key: "address", label: "Street address" },
              { key: "city", label: "City", half: true },
              { key: "state", label: "State / region", half: true },
              { key: "postalCode", label: "Postal code", half: true },
              { key: "country", label: "Country", half: true },
            ]}
            values={{
              address: account.address,
              city: account.city,
              state: account.state,
              postalCode: account.postalCode,
              country: account.country,
            }}
            onSave={updateAccountDetails}
          />
        </SettingsSection>

        <SettingsSection id="notifications" title="Notifications" description="Choose how much you hear from us, and where.">
          <NotificationPreferencesForm
            emailNotifications={account.emailNotifications ?? "ALL"}
            smsNotifications={account.smsNotifications ?? "IMPORTANT_ONLY"}
            marketingEmailsEnabled={account.marketingEmailsEnabled}
          />
        </SettingsSection>

        <SettingsSection id="security" title="Login & security">
          <PasswordSection signsInWithGoogle={account.authProvider === "GOOGLE"} />
        </SettingsSection>

        <SettingsSection id="payments" title="Payments" description="Receipts, invoices and saved cards are handled securely by Stripe.">
          <div className="border-b border-gray-200 py-4">
            <BillingPortalButton />
          </div>
        </SettingsSection>

        <section className="flex flex-col gap-4 border-t border-gray-200 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Sign out</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">You&apos;ll need your password (or Google) to sign back in.</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5">
              <LogOut />
              Sign out
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
