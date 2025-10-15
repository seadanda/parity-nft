import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WalletProvider } from "@/contexts/WalletContext";

const unbounded = Unbounded({
  weight: "900",
  subsets: ["latin"],
  variable: "--font-unbounded-custom",
  display: "swap",
});

export const metadata: Metadata = {
  title: "10 Years of Parity | Anniversary NFT Collection",
  description: "Celebrate Parity's 10-year anniversary with unique 3D glass logo NFTs on Polkadot Asset Hub. Mint your soulbound commemorative NFT.",
  keywords: ["Parity", "NFT", "Polkadot", "Asset Hub", "Web3", "10 Years", "Anniversary"],
  authors: [{ name: "Parity Technologies" }],
  openGraph: {
    title: "10 Years of Parity Anniversary NFT Collection",
    description: "Celebrate a decade of innovation with unique 3D glass logo NFTs on Polkadot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "10 Years of Parity Anniversary NFT Collection",
    description: "Celebrate a decade of innovation with unique 3D glass logo NFTs on Polkadot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${unbounded.variable} antialiased`}>
        <WalletProvider>
          <ErrorBoundary>
            <Header />
            <main id="main-content">
              {children}
            </main>
          </ErrorBoundary>
        </WalletProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
