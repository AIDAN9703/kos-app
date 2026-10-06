"use client";

import { InterceptingDialog } from "@/shared/components/ui/dialog";
import AuthForm from "@/features/auth/components/AuthForm";
import { signInSchema } from "@/features/_validation/validations";
import { signInWithEmail } from "@/features/auth/client/email-auth";

export default function SignInModal() {
  const signInDefaultValues = {
    email: "",
    password: "",
  };

  return (
    <InterceptingDialog
      title="Welcome Back" 
      description="Sign in to complete your booking"
    >
      <AuthForm
        type="SIGN_IN"
        schema={signInSchema}
        defaultValues={signInDefaultValues}
        onSubmit={signInWithEmail}
      />
    </InterceptingDialog>
  );
}
