import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/themeContext";
import { WalletProvider } from "@/lib/wallet/walletContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NetworkBanner from "@/components/wallet/NetworkBanner";
import MockDataBanner from "@/components/shared/MockDataBanner";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgriShield — Parametric Rainfall-Based Crop Protection",
  description:
    "AgriShield: Rainfall-Based Parametric Crop Insurance powered by Chainlink CRE and automated EVM smart contracts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${montserrat.variable}`} suppressHydrationWarning>
      <body className={`${montserrat.className} antialiased flex min-h-screen flex-col bg-white dark:bg-[#000000] text-slate-900 dark:text-slate-100 relative selection:bg-[#1a5b55]/20 selection:text-[#1a5b55] dark:selection:text-[#4ea399]`}>
        <ThemeProvider>
          {/* Subtle Background Pattern (Clean, No Glowing Ambient Spotlight Blobs) */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-20" />
          </div>

          {/* Interactive Application Container */}
          <div className="relative z-10 flex min-h-screen flex-col">
            <WalletProvider>
              {/* Mock data indicator */}
              <MockDataBanner />

              {/* Wrong network warning */}
              <NetworkBanner />

              {/* Navigation Header */}
              <Navbar />

              {/* Page content */}
              <main className="flex-1">{children}</main>

              {/* System Telemetry & Footer */}
              <Footer />
            </WalletProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
