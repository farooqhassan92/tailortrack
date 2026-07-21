import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <SignIn
        fallbackRedirectUrl="/business-profile"
        forceRedirectUrl="/business-profile"
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </main>
  );
}
