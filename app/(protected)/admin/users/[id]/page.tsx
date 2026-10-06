import { userService } from "@/features/users/user.service";
import { getSignInMethods } from "@/features/users/user-access";
import { UserProfileHeader } from "@/features/users/components/AdminUserProfileHeader";
import { AdminUserPersonalInfo } from "@/features/users/components/AdminUserPersonalInfo";
import { AdminUserAccountInfo } from "@/features/users/components/AdminUserAccountInfo";
import { AdminUserRecentBookings } from "@/features/users/components/AdminUserRecentBookings";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const resolvedParams = await params;
  const userId = resolvedParams.id;

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile userId={userId} />
      </Suspense>
    </div>
  );
}

// Separate component for data fetching to enable Suspense
async function UserProfile({ userId }: { userId: string }) {
  // Get user with bookings for admin detail page
  const user = await userService
    .getUserById(userId, {
      bookings: { limit: 10 },
      captainProfile: true,
      crewProfile: true,
    })
    .catch(() => null);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <UserProfileHeader
        user={user}
        captainProfileStatus={user.captainProfile?.status ?? null}
        crewProfileStatus={user.crewProfile?.status ?? null}
      />

      {/* Info Cards - bubble style */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminUserPersonalInfo user={user} />
        <AdminUserAccountInfo user={user} signInMethods={await getSignInMethods(user.id)} />
      </div>

      {/* Recent Bookings - full width */}
      <AdminUserRecentBookings userId={user.id} bookings={user.bookings} />
    </div>
  );
}
// Skeleton UI for loading state
function ProfileSkeleton() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-20 w-full max-w-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[280px] rounded-xl" />
        <Skeleton className="h-[280px] rounded-xl" />
      </div>
      <Skeleton className="h-[320px] rounded-xl" />
    </div>
  );
}
