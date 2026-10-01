import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
          <ShieldAlert className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-2">403</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Access Denied
        </h2>
        <p className="text-gray-600 mb-8">
          You don&apos;t have permission to access this resource. Please contact an
          administrator if you believe this is an error.
        </p>

        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link href="/profile">My Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
