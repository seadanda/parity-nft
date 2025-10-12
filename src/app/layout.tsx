import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const unbounded = Unbounded({
  weight: "900",
  subsets: ["latin"],
  variable: "--font-unbounded-custom",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Parity 10 Years | Anniversary NFT Collection",
  description: "Celebrate Parity's 10-year anniversary with unique 3D glass logo NFTs on Polkadot Asset Hub. Mint your soulbound commemorative NFT.",
  keywords: ["Parity", "NFT", "Polkadot", "Asset Hub", "Web3", "10 Years", "Anniversary"],
  authors: [{ name: "Parity Technologies" }],
  openGraph: {
    title: "Parity 10 Years Anniversary NFT Collection",
    description: "Celebrate a decade of innovation with unique 3D glass logo NFTs on Polkadot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parity 10 Years Anniversary NFT Collection",
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
        <ErrorBoundary>
          <Header />
          <main id="main-content">
            {children}
          </main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
