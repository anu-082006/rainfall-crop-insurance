import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet/walletContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NetworkBanner from "@/components/wallet/NetworkBanner";
import MockDataBanner from "@/components/shared/MockDataBanner";

export const metadata: Metadata = {
  title: "AgriShield — Smart Rainfall-Based Crop Protection",
  description:
    "AgriShield: Rainfall-Based Parametric Crop Insurance. " +
    "Smart on-chain protection against drought and erratic rainfall.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased flex min-h-screen flex-col bg-gray-50 text-gray-900 font-sans"
      >
        {/*
          WalletProvider wraps the entire app so all pages and components
          can access wallet state via useWallet() without prop-drilling.
        */}
        <WalletProvider>
          {/* Mock data indicator — visible whenever MOCK_MODE=true */}
          <MockDataBanner />

          {/* Wrong network warning — sticky, sits above Navbar content */}
          <NetworkBanner />

          {/* Navigation */}
          <Navbar />

          {/* Page content */}
          <main className="flex-1">{children}</main>

          {/* Footer with test-only disclaimer */}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
