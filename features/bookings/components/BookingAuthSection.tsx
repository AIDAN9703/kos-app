"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import AuthForm from "@/features/auth/components/AuthForm";
import { signInSchema, signUpSchema } from "@/features/_validation/validations";
import {
  continueWithGoogle,
  signInWithEmail,
  signUpWithEmail,
} from "@/features/auth/client/email-auth";
import BookingPhoneAuth from "./BookingPhoneAuth";
import { bookingAuthMenuButtonClass } from "./booking-auth-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useIsMobile } from "@/shared/lib/hooks/use-mobile";

export type BookingAuthModalView = "menu" | "sign-in" | "sign-up" | null;

interface BookingAuthSectionProps {
  authModal: BookingAuthModalView;
  onAuthModalChange: (next: BookingAuthModalView) => void;
}

function AuthMenu({
  callbackUrl,
  onSignIn,
  onSignUp,
  onPhoneSuccess,
}: {
  callbackUrl: string;
  onSignIn: () => void;
  onSignUp: () => void;
  onPhoneSuccess: () => void;
}) {
  return (
    <div className="space-y-5">
      <BookingPhoneAuth onSuccess={onPhoneSuccess} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => continueWithGoogle(callbackUrl)}
        className={`${bookingAuthMenuButtonClass} gap-2.5`}
      >
        <Image src="/icons/google.svg" alt="" width={18} height={18} className="shrink-0" />
        Continue with Google
      </button>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button type="button" className={bookingAuthMenuButtonClass} onClick={onSignIn}>
          Sign in with email
        </button>
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground active:scale-[0.99]"
          onClick={onSignUp}
        >
          Create account
        </button>
      </div>
    </div>
  );
}

export default function BookingAuthSection({
  authModal,
  onAuthModalChange,
}: BookingAuthSectionProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const callbackUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const isOpen = authModal !== null;

  const handleAuthSuccess = () => {
    onAuthModalChange(null);
    router.refresh();
  };

  const title =
    authModal === "sign-up"
      ? "Create account"
      : authModal === "sign-in"
        ? "Sign in"
        : "Continue";

  const description =
    authModal === "sign-up"
      ? "Create an account to complete this booking. Your trip details stay on this page."
      : authModal === "sign-in"
        ? "Sign in to complete this booking. Your trip details stay on this page."
        : "Sign in or continue with your phone. Your trip details stay on this page.";

  const body =
    authModal === "sign-in" ? (
      <AuthForm
        key="booking-sign-in"
        type="SIGN_IN"
        schema={signInSchema}
        defaultValues={{ email: "", password: "" }}
        onSubmit={signInWithEmail}
        embeddedCallbackUrl={callbackUrl}
        variant="embedded"
        hideHeading
        onSwitchToSignUp={() => onAuthModalChange("sign-up")}
      />
    ) : authModal === "sign-up" ? (
      <AuthForm
        key="booking-sign-up"
        type="SIGN_UP"
        schema={signUpSchema}
        defaultValues={{
          email: "",
          firstName: "",
          lastName: "",
          phoneNumber: "",
          password: "",
        }}
        onSubmit={signUpWithEmail}
        embeddedCallbackUrl={callbackUrl}
        variant="embedded"
        hideHeading
        onSwitchToSignIn={() => onAuthModalChange("sign-in")}
      />
    ) : (
      <AuthMenu
        callbackUrl={callbackUrl}
        onSignIn={() => onAuthModalChange("sign-in")}
        onSignUp={() => onAuthModalChange("sign-up")}
        onPhoneSuccess={handleAuthSuccess}
      />
    );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onAuthModalChange(null)}>
        <DrawerContent className="max-h-[92dvh] rounded-t-[1.75rem] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1">
          <DrawerTitle className="text-xl font-semibold tracking-tight">{title}</DrawerTitle>
          <DrawerDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </DrawerDescription>
          <div className="mt-5 overflow-y-auto">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onAuthModalChange(null)}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl p-6 sm:max-w-[26rem] sm:p-8">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-2">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
