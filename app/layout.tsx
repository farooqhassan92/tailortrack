import type { Metadata } from "next";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          content="telephone=no, date=no, email=no, address=no"
          name="format-detection"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}