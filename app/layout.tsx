import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

// Display serif for titles and big numbers, a clean geometric sans for everything else (self-hosted by next/font).
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-serif", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "VizionAI Portal", template: "%s · VizionAI Portal" },
  description: "Private portal for running VizionAI.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${serif.variable} ${body.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
