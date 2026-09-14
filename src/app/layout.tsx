import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { ToastProvider } from "@/components/ui/ToastNotification";
import { WhatsAppFloatingButton } from "@/components/storefront/WhatsAppFloatingButton";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Pop Shake Sorveteria",
  description: "Cardápio Digital e Delivery Oficial da Pop Shake Sorveteria",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
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
        <link rel="icon" type="image/png" sizes="64x64" href="/icon.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('popshake-theme');if(s==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={cn("font-sans bg-background text-foreground antialiased", inter.className)}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <EditModeProvider>
              <CartProvider>
                <ToastProvider>
                  {children}
                  <WhatsAppFloatingButton />
                </ToastProvider>
              </CartProvider>
            </EditModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
