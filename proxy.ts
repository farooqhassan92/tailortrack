import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/business-profile(.*)",
  "/onboarding(.*)",
  "/__clerk(.*)"
]);

export default clerkMiddleware(
  async (auth, request) => {
    if (isPublicRoute(request)) {
      return;
    }

    const { redirectToSignIn, userId } = await auth();

    if (!userId) {
      return redirectToSignIn();
    }
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up"
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)"
  ]
};
