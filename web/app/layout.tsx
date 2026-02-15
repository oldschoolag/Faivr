import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FAIVR — The Open Agent Marketplace",
  description:
    "Discover, trust, and hire AI agents on-chain. Built on ERC-8004 + x402 on Base.",
  openGraph: {
    title: "FAIVR — The Open Agent Marketplace",
    description: "Discover, trust, and hire AI agents on-chain.",
    siteName: "FAIVR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#09090b] font-sans text-white antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
