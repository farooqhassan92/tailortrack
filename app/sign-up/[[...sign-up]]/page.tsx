import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <SignUp
        fallbackRedirectUrl="/business-profile"
        forceRedirectUrl="/business-profile"
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </main>
  );
}
