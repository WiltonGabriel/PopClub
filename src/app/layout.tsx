import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "PopClub - Pop Shake Açaí Expresso",
  description: "Peça seu açaí, sorvete e shake favorito com entrega rápida. PopClub — Pop Shake Açaí Expresso.",
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
        Prevents flash of wrong theme on SSR hydration.
      */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('popshake-theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s==='dark'||(s===null&&p)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={cn("font-sans bg-background text-foreground antialiased", inter.className)}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
