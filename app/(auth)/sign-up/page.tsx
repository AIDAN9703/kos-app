"use client";

import AuthForm from "@/features/auth/components/AuthForm";
import { signUpWithEmail } from "@/features/auth/client/email-auth";
import { signUpSchema } from "@/features/_validation/validations";

const Page = () => (
  <AuthForm
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
  />
);

export default Page;
