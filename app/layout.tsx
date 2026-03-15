import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meridian Node | AI-Powered Land Infrastructure Intelligence",
  description:
    "AI-powered land infrastructure intelligence platform for site selection across data centers, solar, wind, EV charging, and land development. Autonomous agents score, analyze, and discover sites.",
  icons: { icon: "/favicon.ico" },
  metadataBase: new URL("https://meridiannode.io"),
  openGraph: {
    title: "Meridian Node — AI Land Intelligence",
    description: "Autonomous AI agents for infrastructure site discovery, scoring, and feasibility analysis.",
    url: "https://meridiannode.io",
    siteName: "Meridian Node",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian Node — AI Land Intelligence",
    description: "Autonomous AI agents for infrastructure site discovery, scoring, and feasibility analysis.",
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
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-bg-primary text-text-primary`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
