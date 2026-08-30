import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PopClub Logistics",
  description: "Advanced delivery and logistics tracking for PopClub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={outfit.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
