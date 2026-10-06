import { userService } from "@/features/users/user.service";
import { AdminUserCreateEditForm } from "@/features/users/components/AdminUserCreateEditForm";
import { notFound } from "next/navigation";
import { type UpdateUserInput } from "@/features/users/user.validation";
import { Suspense } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { parseRoles } from "@/shared/lib/auth/permissions";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/features/users/user-roles.constants";

interface UserEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserEditPage({ params }: UserEditPageProps) {
  const resolvedParams = await params;
  const userId = resolvedParams.id;

  return (
    <div className="space-y-6">
      {/* User Edit Form with Suspense for progressive loading */}
      <Suspense fallback={<FormSkeleton />}>
        <AdminUserCreateEditFormWithData userId={userId} />
      </Suspense>
    </div>
  );
}

// Separate component for data fetching to enable Suspense
async function AdminUserCreateEditFormWithData({ userId }: { userId: string }) {
  const userData = await userService.getUserById(userId).catch(() => null);

  if (!userData) {
    notFound();
  }

  // Transform database user to match the form's expected format
  // Only include fields that are in the UpdateUserInput type
  const user: Partial<UpdateUserInput> = {
    firstName: userData.firstName || null,
    lastName: userData.lastName || null,
    bio: userData.bio || null,
    username: userData.username,
    email: userData.email,
    phoneNumber: userData.phoneNumber || null,
    roles: parseRoles(userData.role).filter((role): role is AssignableRole =>
      (ASSIGNABLE_ROLES as readonly string[]).includes(role)
    ),
    // Only include authProvider if it's a valid value in the enum
    ...(userData.authProvider ? { authProvider: userData.authProvider } : {}),
    address: userData.address || null,
    city: userData.city || null,
    state: userData.state || null,
    postalCode: userData.postalCode || null,
    country: userData.country || null,
    emailVerified: userData.emailVerified,
    phoneVerified: userData.phoneVerified,
    identityVerified: userData.identityVerified || false,
    identityVerificationType: userData.identityVerificationType || null,
  };

  return <AdminUserCreateEditForm user={user} userId={userId} />;
}

// Skeleton UI for the form loading state
function FormSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4].map((section) => (
        <div key={section} className="space-y-4">
          <div className="pb-4 border-b border-border">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60 mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-between pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
