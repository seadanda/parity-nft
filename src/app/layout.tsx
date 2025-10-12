import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const unbounded = Unbounded({
  weight: "900",
  subsets: ["latin"],
  variable: "--font-unbounded-custom",
});

export const metadata: Metadata = {
  title: "Parity 10 Years | Anniversary NFT Collection",
  description: "Celebrate Parity's 10-year anniversary with unique 3D glass logo NFTs on Polkadot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${unbounded.variable} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
