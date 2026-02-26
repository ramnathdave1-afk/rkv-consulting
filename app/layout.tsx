import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RKV Consulting | The Intelligent Real Estate Operating System",
  description:
    "AI-powered real estate investment platform. Analyze deals, manage properties, screen tenants, and optimize your portfolio with institutional-grade intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${dmSans.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
