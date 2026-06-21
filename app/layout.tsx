import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { WalletProvider } from "@/lib/wallet-context";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CryptoLaunch — Margin Launchpad",
  description:
    "Launch tokens with bonding curve & trade with margin leverage up to 50%",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <WalletProvider>
          <div className="accent-bar" />
          <Navbar />
          <main className="flex-1">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
