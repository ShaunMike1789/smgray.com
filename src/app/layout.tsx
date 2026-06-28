import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Saira_Semi_Condensed, Teko } from "next/font/google";
import "./globals.css";

const bodyFont = Saira_Semi_Condensed({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Teko({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SMGray Software",
  description:
    "SMGray builds focused applications and private browser-first utilities.",
};

function Providers({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
