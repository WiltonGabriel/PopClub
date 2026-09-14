import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { AddressProvider } from "@/contexts/AddressContext";
import { ToastProvider } from "@/components/ui/ToastNotification";
import { AddressModal } from "@/components/storefront/AddressModal";
import { WhatsAppFloatingButton } from "@/components/storefront/WhatsAppFloatingButton";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Pop Shake Sorveteria",
  description: "Cardápio Digital e Delivery Oficial da Pop Shake Sorveteria",
  icons: {
    icon: [
      { url: "/icon.png?v=2" },
      { url: "/favicon.ico?v=2" },
    ],
    shortcut: "/icon.png?v=2",
    apple: "/icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(spaceGrotesk.variable, inter.variable, jetBrainsMono.variable)}
      suppressHydrationWarning
    >
      {/*
        Inline script — runs synchronously before first paint.
        Default is strictly Light Mode unless 'dark' is explicitly stored in localStorage.
      */}
      <head>
        <link rel="icon" type="image/png" sizes="192x192" href="/icon.png?v=2" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="shortcut icon" href="/icon.png?v=2" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=2" />
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('popshake-theme');if(s==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={cn("font-sans bg-background text-foreground antialiased overflow-x-hidden min-h-screen", inter.className)}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <EditModeProvider>
              <CartProvider>
                <AddressProvider>
                  <ToastProvider>
                    {children}
                    <AddressModal />
                    <WhatsAppFloatingButton />
                  </ToastProvider>
                </AddressProvider>
              </CartProvider>
            </EditModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
