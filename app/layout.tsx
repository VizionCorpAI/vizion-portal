import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import "./globals.css";

// Fraunces (soft, characterful display serif with italics) for titles, card headings and big numbers;
// Sora (geometric, slightly futuristic) for everything else. Self-hosted by next/font.
const serif = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "opsz"], variable: "--font-serif", display: "swap" });
const body = Sora({ subsets: ["latin"], variable: "--font-body", display: "swap" });

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
