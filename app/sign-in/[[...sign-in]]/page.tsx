import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";

import { AuthLoadingScreen } from "@/components/ui/auth-loading-screen";

export default function SignInPage() {
  return (
    <>
      <ClerkLoading>
        <AuthLoadingScreen message="Loading secure sign in..." />
      </ClerkLoading>
      <ClerkLoaded>
        <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
          <SignIn
            fallbackRedirectUrl="/business-profile"
            forceRedirectUrl="/business-profile"
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
          />
        </main>
      </ClerkLoaded>
    </>
  );
}
