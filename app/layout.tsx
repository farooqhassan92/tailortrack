import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
  title: "TailorTrack",
  description: "Cloth shop and tailoring management system."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInForceRedirectUrl="/business-profile"
      signInUrl="/sign-in"
      signUpForceRedirectUrl="/business-profile"
      signUpUrl="/sign-up"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta
            content="telephone=no, date=no, email=no, address=no"
            name="format-detection"
          />
          <Script id="remove-extension-hydration-attrs" strategy="beforeInteractive">
            {`
              (() => {
                const removeInjectedAttributes = () => {
                  document.querySelectorAll("[bis_skin_checked]").forEach((element) => {
                    element.removeAttribute("bis_skin_checked");
                  });
                };

                removeInjectedAttributes();
                new MutationObserver(removeInjectedAttributes).observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true
                });
              })();
            `}
          </Script>
        </head>
        <body suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  );
}
