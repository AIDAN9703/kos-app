"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/shared/lib/auth/auth-client";

import {
  completeBookingPhoneProfile,
  sendBookingPhoneCode,
  verifyBookingPhoneCode,
} from "@/features/auth/actions/booking-phone-auth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { BookingOtpInput } from "./BookingOtpInput";
import {
  bookingAuthInputClass,
  bookingAuthPrimaryButtonClass,
} from "./booking-auth-ui";

type Step = "phone" | "code" | "profile";

interface BookingPhoneAuthProps {
  onSuccess: () => void;
}

export default function BookingPhoneAuth({ onSuccess }: BookingPhoneAuthProps) {
  const { refetch } = useSession();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  // Proof the number was verified, for the profile step (the code is only checked once).
  const [signUpProof, setSignUpProof] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      const result = await sendBookingPhoneCode(phone);
      if (!result.success) {
        toast({
          title: "Could not send code",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      setStep("code");
      toast({
        title: "Code sent",
        description: "Check your messages for a 6-digit code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    try {
      const result = await verifyBookingPhoneCode(phone, code);
      if (!result.success) {
        toast({
          title: "Verification failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.data?.existingUser) {
        await refetch();
        toast({ title: "Signed in", description: "You're ready to complete your booking." });
        onSuccess();
        return;
      }

      setSignUpProof(result.data?.signUpProof ?? "");
      setStep("profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    setIsLoading(true);
    try {
      const result = await completeBookingPhoneProfile(signUpProof, {
        firstName,
        lastName,
        email,
      });
      if (!result.success) {
        toast({
          title: "Could not finish",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      await refetch();
      toast({ title: "You're all set", description: result.message });
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "phone") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="booking-phone" className="text-sm font-semibold text-foreground">
            Phone number
          </Label>
          <Input
            id="booking-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={bookingAuthInputClass}
          />
        </div>
        <Button
          type="button"
          className={bookingAuthPrimaryButtonClass}
          disabled={isLoading || !phone.trim()}
          onClick={handleSendCode}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter the code we sent to{" "}
          <span className="font-bold text-foreground">{phone}</span>
        </p>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Verification code</Label>
          <BookingOtpInput value={code} onChange={setCode} disabled={isLoading} />
        </div>
        <Button
          type="button"
          className={bookingAuthPrimaryButtonClass}
          disabled={isLoading || code.length < 4}
          onClick={handleVerifyCode}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </Button>
        <button
          type="button"
          onClick={() => setStep("phone")}
          className="w-full py-1 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Almost there — just a few details to finish up.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="booking-first" className="text-sm font-semibold text-foreground">
            First name
          </Label>
          <Input
            id="booking-first"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={bookingAuthInputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking-last" className="text-sm font-semibold text-foreground">
            Last name
          </Label>
          <Input
            id="booking-last"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={bookingAuthInputClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="booking-email" className="text-sm font-semibold text-foreground">
          Email
        </Label>
        <Input
          id="booking-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={bookingAuthInputClass}
        />
      </div>
      <Button
        type="button"
        className={bookingAuthPrimaryButtonClass}
        disabled={
          isLoading || !firstName.trim() || !lastName.trim() || !email.trim()
        }
        onClick={handleCompleteProfile}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
      </Button>
    </div>
  );
}
