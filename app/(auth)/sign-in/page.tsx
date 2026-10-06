"use client";

import AuthForm from "@/features/auth/components/AuthForm";
import { signInSchema } from "@/features/_validation/validations";
import { signInWithEmail } from "@/features/auth/client/email-auth";

const Page = () => (
  <AuthForm
    type="SIGN_IN"
    schema={signInSchema}
    defaultValues={{
      email: "",
      password: "",
    }}
    onSubmit={signInWithEmail}
  />
);

export default Page;
