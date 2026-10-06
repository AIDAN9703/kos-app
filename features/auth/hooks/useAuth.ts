import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/shared/lib/auth/auth-client';
import { toast } from '@/shared/lib/hooks/use-toast';
import { safeRedirectPath } from '@/features/auth/client/safe-redirect';

type AuthAction<T> = (data: T) => Promise<{
  success: boolean;
  error?: string;
  data?: { redirectUrl?: string; message?: string };
}>;

export function useAuth<T>() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { refetch } = useSession();

  const handleAuth = async (
    data: T,
    action: AuthAction<T>,
    callbackUrl: string = "/",
    successMessage?: string
  ) => {
    setIsSubmitting(true);
    
    try {
      const result = await action(data);

      if (result.success) {
        toast({
          title: "Success",
          description: result.data?.message || successMessage || "Operation successful",
        });

        // Refresh the session for client UI, then server-rendered UI.
        await refetch();

        // Redirect logic — never follow absolute/external URLs
        const redirectTo = safeRedirectPath(result.data?.redirectUrl || callbackUrl);
        router.push(redirectTo);
        router.refresh();
        
        return { success: true };
      } else {
        // Handle different error scenarios
        if (result.data?.redirectUrl) {
          toast({
            title: "Action Required",
            description: result.data.message || result.error || "Additional action required.",
          });
          router.push(safeRedirectPath(result.data.redirectUrl));
        } else {
          toast({
            title: "Error",
            description: result.error || "An error occurred.",
            variant: "destructive",
          });
        }
        
        return { success: false, error: result.error };
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
      
      return { success: false, error: "Unknown error" };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleAuth,
  };
} 