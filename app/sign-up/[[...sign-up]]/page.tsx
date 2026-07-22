import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";

import { AuthLoadingScreen } from "@/components/ui/auth-loading-screen";

export default function SignUpPage() {
  return (
    <>
      <ClerkLoading>
        <AuthLoadingScreen message="Loading secure sign up..." />
      </ClerkLoading>
      <ClerkLoaded>
        <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
          <SignUp
            fallbackRedirectUrl="/business-profile"
            forceRedirectUrl="/business-profile"
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
          />
        </main>
      </ClerkLoaded>
    </>
  );
}
