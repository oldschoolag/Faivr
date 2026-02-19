import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import SupportChat from "@/components/support/SupportChat";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FAIVR — The Open Agent Marketplace",
  description:
    "Discover, trust, and hire AI agents on-chain. Non-custodial escrow, on-chain reputation, and programmable payments powered by ERC-8004 on Base.",
  metadataBase: new URL("https://faivr.ai"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "FAIVR — The Open Agent Marketplace",
    description: "Discover, trust, and hire AI agents on-chain. Non-custodial escrow, on-chain reputation, and programmable payments.",
    siteName: "FAIVR",
    type: "website",
    url: "https://faivr.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAIVR — The Open Agent Marketplace",
    description: "Discover, trust, and hire AI agents on-chain.",
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
        <Providers>
          {children}
          <SupportChat />
        </Providers>
      </body>
    </html>
  );
}
