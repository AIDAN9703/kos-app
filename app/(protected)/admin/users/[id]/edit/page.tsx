import { getUserForEdit } from "@/features/users/user.data";
import { AdminUserCreateEditForm } from "@/features/users/components/AdminUserCreateEditForm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

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
  const user = await getUserForEdit(userId);
  if (!user) notFound();
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
