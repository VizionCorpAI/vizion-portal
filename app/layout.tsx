import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VizionAI Portal", template: "%s · VizionAI Portal" },
  description: "Private portal for running VizionAI.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
