import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RKV Consulting | The Intelligent Real Estate Operating System",
  description:
    "AI-powered real estate investment platform. Analyze deals, manage properties, screen tenants, and optimize your portfolio with institutional-grade intelligence.",
  metadataBase: new URL("https://rkv-consulting.vercel.app"),
  openGraph: {
    title: "RKV Consulting | The Intelligent Real Estate Operating System",
    description:
      "AI-powered real estate investment platform. Analyze deals, manage properties, screen tenants, and automate your entire portfolio.",
    url: "https://rkv-consulting.vercel.app",
    siteName: "RKV Consulting",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RKV Consulting | AI-Powered Real Estate OS",
    description:
      "The operating system for serious real estate investors. Deal analysis, live market intelligence, AI agents, and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSerif.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
