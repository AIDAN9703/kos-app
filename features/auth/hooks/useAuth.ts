import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from '../../../shared/lib/hooks/use-toast';

type AuthAction<T> = (data: T) => Promise<{
  success: boolean;
  error?: string;
  data?: { redirectUrl?: string; message?: string };
}>;

/** Only allow same-origin relative paths — blocks open redirects via ?callbackUrl=https://evil.com */
function safeRedirectPath(url: string | undefined, fallback = "/"): string {
  if (!url) return fallback;
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }
  return fallback;
}

export function useAuth<T>() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { update } = useSession();

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

        // Update session to reflect new auth state
        await update();

        // Redirect logic — never follow absolute/external URLs
        const redirectTo = safeRedirectPath(result.data?.redirectUrl || callbackUrl);
        router.push(redirectTo);
        
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